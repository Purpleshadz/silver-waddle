const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
const Dashboard = require('../models/Dashboard');
const Organization = require('../models/Organization');

// POST /org/switch
router.post('/org/switch', requireAuth, (req, res) => {
  const { orgId } = req.body;
  if (orgId) {
    req.session.activeOrg = orgId;
  }
  const referer = req.get('Referer') || '/';
  res.redirect(referer);
});

// GET / — main dashboard view
router.get('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const activeOrg = req.session.activeOrg;
    if (!activeOrg) {
      return res.render('index', { title: 'Dashboard', dashboard: null });
    }

    // Find default dashboard or first one
    let dashboard = await Dashboard.findOne({ organization: activeOrg, isDefault: true });
    if (!dashboard) {
      dashboard = await Dashboard.findOne({ organization: activeOrg }).sort({ createdAt: 1 });
    }

    res.render('index', {
      title: dashboard ? dashboard.title : 'Dashboard',
      dashboard: dashboard || null
    });
  } catch (err) {
    console.error('Dashboard GET / error:', err);
    res.render('index', { title: 'Dashboard', dashboard: null });
  }
});

// GET /dashboards — list dashboards for active org
router.get('/dashboards', requireAuth, requireAdmin, async (req, res) => {
  try {
    const activeOrg = req.session.activeOrg;
    const dashboards = activeOrg
      ? await Dashboard.find({ organization: activeOrg }).sort({ createdAt: 1 })
      : [];
    res.render('dashboard/list', { title: 'Dashboards', dashboards });
  } catch (err) {
    console.error('Dashboards list error:', err);
    res.render('dashboard/list', { title: 'Dashboards', dashboards: [] });
  }
});

// GET /dashboards/new
router.get('/dashboards/new', requireAuth, requireAdmin, (req, res) => {
  res.render('dashboard/edit', {
    title: 'New Dashboard',
    dashboard: { title: '', isDefault: false, widgets: [] },
    isNew: true
  });
});

// POST /dashboards — create
router.post('/dashboards', requireAuth, requireAdmin, async (req, res) => {
  try {
    const activeOrg = req.session.activeOrg;
    if (!activeOrg) {
      req.session.flash = { type: 'danger', message: 'No active organisation selected.' };
      return res.redirect('/dashboards');
    }

    const { title, isDefault } = req.body;
    const setDefault = isDefault === 'on' || isDefault === 'true' || isDefault === '1';

    if (setDefault) {
      await Dashboard.updateMany({ organization: activeOrg }, { isDefault: false });
    }

    await Dashboard.create({
      title,
      organization: activeOrg,
      isDefault: setDefault,
      widgets: []
    });

    req.session.flash = { type: 'success', message: 'Dashboard created.' };
    res.redirect('/dashboards');
  } catch (err) {
    console.error('Create dashboard error:', err);
    req.session.flash = { type: 'danger', message: 'Failed to create dashboard.' };
    res.redirect('/dashboards');
  }
});

// GET /dashboards/:id/edit
router.get('/dashboards/:id/edit', requireAuth, requireAdmin, async (req, res) => {
  try {
    const dashboard = await Dashboard.findById(req.params.id);
    if (!dashboard) {
      req.session.flash = { type: 'danger', message: 'Dashboard not found.' };
      return res.redirect('/dashboards');
    }
    res.render('dashboard/edit', {
      title: 'Edit Dashboard',
      dashboard,
      isNew: false
    });
  } catch (err) {
    console.error('Edit dashboard error:', err);
    req.session.flash = { type: 'danger', message: 'Failed to load dashboard.' };
    res.redirect('/dashboards');
  }
});

// POST /dashboards/:id — update
router.post('/dashboards/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { title, isDefault } = req.body;
    const setDefault = isDefault === 'on' || isDefault === 'true' || isDefault === '1';
    const dashboard = await Dashboard.findById(req.params.id);
    if (!dashboard) {
      req.session.flash = { type: 'danger', message: 'Dashboard not found.' };
      return res.redirect('/dashboards');
    }

    if (setDefault) {
      await Dashboard.updateMany(
        { organization: dashboard.organization, _id: { $ne: dashboard._id } },
        { isDefault: false }
      );
    }

    dashboard.title = title;
    dashboard.isDefault = setDefault;
    await dashboard.save();

    req.session.flash = { type: 'success', message: 'Dashboard updated.' };
    res.redirect('/dashboards');
  } catch (err) {
    console.error('Update dashboard error:', err);
    req.session.flash = { type: 'danger', message: 'Failed to update dashboard.' };
    res.redirect('/dashboards');
  }
});

// POST /dashboards/:id/delete
router.post('/dashboards/:id/delete', requireAuth, requireAdmin, async (req, res) => {
  try {
    await Dashboard.findByIdAndDelete(req.params.id);
    req.session.flash = { type: 'success', message: 'Dashboard deleted.' };
  } catch (err) {
    console.error('Delete dashboard error:', err);
    req.session.flash = { type: 'danger', message: 'Failed to delete dashboard.' };
  }
  res.redirect('/dashboards');
});

// GET /dashboards/:id/widgets/new
router.get('/dashboards/:id/widgets/new', requireAuth, requireAdmin, async (req, res) => {
  try {
    const dashboard = await Dashboard.findById(req.params.id);
    if (!dashboard) {
      req.session.flash = { type: 'danger', message: 'Dashboard not found.' };
      return res.redirect('/dashboards');
    }
    res.render('dashboard/widget-form', {
      title: 'Add Widget',
      dashboard
    });
  } catch (err) {
    console.error('New widget form error:', err);
    res.redirect('/dashboards');
  }
});

// POST /dashboards/:id/widgets — add widget
router.post('/dashboards/:id/widgets', requireAuth, requireAdmin, async (req, res) => {
  try {
    const dashboard = await Dashboard.findById(req.params.id);
    if (!dashboard) {
      req.session.flash = { type: 'danger', message: 'Dashboard not found.' };
      return res.redirect('/dashboards');
    }

    const { title, measurement, tagKey, tagValue, field, dateRange, chartType } = req.body;
    const order = dashboard.widgets.length;

    dashboard.widgets.push({ title, measurement, tagKey, tagValue, field, dateRange, chartType, order });
    await dashboard.save();

    req.session.flash = { type: 'success', message: 'Widget added.' };
    res.redirect(`/dashboards/${req.params.id}/edit`);
  } catch (err) {
    console.error('Add widget error:', err);
    req.session.flash = { type: 'danger', message: 'Failed to add widget.' };
    res.redirect(`/dashboards/${req.params.id}/edit`);
  }
});

// POST /dashboards/:id/widgets/:widgetId/delete
router.post('/dashboards/:id/widgets/:widgetId/delete', requireAuth, requireAdmin, async (req, res) => {
  try {
    await Dashboard.findByIdAndUpdate(req.params.id, {
      $pull: { widgets: { _id: req.params.widgetId } }
    });
    req.session.flash = { type: 'success', message: 'Widget deleted.' };
  } catch (err) {
    console.error('Delete widget error:', err);
    req.session.flash = { type: 'danger', message: 'Failed to delete widget.' };
  }
  res.redirect(`/dashboards/${req.params.id}/edit`);
});

module.exports = router;
