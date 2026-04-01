const express = require('express');
const router = express.Router();
const { requireAdmin, requireLeadAdmin } = require('../middleware/auth');
const User = require('../models/User');
const Organization = require('../models/Organization');
const Dashboard = require('../models/Dashboard');

// GET /admin
router.get('/admin', requireAdmin, async (req, res) => {
  try {
    const [userCount, orgCount, dashboardCount] = await Promise.all([
      User.countDocuments(),
      Organization.countDocuments(),
      Dashboard.countDocuments()
    ]);
    res.render('admin/index', { title: 'Admin Panel', userCount, orgCount, dashboardCount });
  } catch (err) {
    console.error('Admin index error:', err);
    res.render('admin/index', { title: 'Admin Panel', userCount: 0, orgCount: 0, dashboardCount: 0 });
  }
});

// GET /admin/users
router.get('/admin/users', requireAdmin, async (req, res) => {
  try {
    const users = await User.find().populate('organizations').sort({ createdAt: 1 });
    res.render('admin/users', { title: 'Manage Users', users });
  } catch (err) {
    console.error('Admin users error:', err);
    res.render('admin/users', { title: 'Manage Users', users: [] });
  }
});

// GET /admin/users/new
router.get('/admin/users/new', requireAdmin, async (req, res) => {
  try {
    const allOrgs = await Organization.find().sort({ name: 1 });
    res.render('admin/user-form', {
      title: 'New User',
      formUser: { username: '', role: 'admin', organizations: [] },
      allOrgs,
      isNew: true
    });
  } catch (err) {
    console.error('New user form error:', err);
    res.redirect('/admin/users');
  }
});

// POST /admin/users — create
router.post('/admin/users', requireAdmin, async (req, res) => {
  try {
    const { username, password, role, organizations } = req.body;

    // Only lead_admin can create lead_admin accounts
    const assignedRole = (role === 'lead_admin' && req.session.role === 'lead_admin') ? 'lead_admin' : 'admin';

    const orgIds = organizations
      ? (Array.isArray(organizations) ? organizations : [organizations])
      : [];

    const user = new User({ username, password, role: assignedRole, organizations: orgIds });
    await user.save();

    req.session.flash = { type: 'success', message: `User "${username}" created.` };
    res.redirect('/admin/users');
  } catch (err) {
    console.error('Create user error:', err);
    req.session.flash = { type: 'danger', message: 'Failed to create user: ' + err.message };
    res.redirect('/admin/users/new');
  }
});

// GET /admin/users/:id/edit
router.get('/admin/users/:id/edit', requireAdmin, async (req, res) => {
  try {
    const [formUser, allOrgs] = await Promise.all([
      User.findById(req.params.id).populate('organizations'),
      Organization.find().sort({ name: 1 })
    ]);
    if (!formUser) {
      req.session.flash = { type: 'danger', message: 'User not found.' };
      return res.redirect('/admin/users');
    }
    res.render('admin/user-form', {
      title: 'Edit User',
      formUser,
      allOrgs,
      isNew: false
    });
  } catch (err) {
    console.error('Edit user form error:', err);
    res.redirect('/admin/users');
  }
});

// POST /admin/users/:id — update
router.post('/admin/users/:id', requireAdmin, async (req, res) => {
  try {
    const { username, password, role, organizations } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) {
      req.session.flash = { type: 'danger', message: 'User not found.' };
      return res.redirect('/admin/users');
    }

    user.username = username;

    // Only lead_admin can assign lead_admin role
    if (req.session.role === 'lead_admin') {
      user.role = role === 'lead_admin' ? 'lead_admin' : 'admin';
    } else {
      user.role = 'admin';
    }

    user.organizations = organizations
      ? (Array.isArray(organizations) ? organizations : [organizations])
      : [];

    if (password && password.trim() !== '') {
      user.password = password;
    }

    await user.save();
    req.session.flash = { type: 'success', message: `User "${username}" updated.` };
    res.redirect('/admin/users');
  } catch (err) {
    console.error('Update user error:', err);
    req.session.flash = { type: 'danger', message: 'Failed to update user: ' + err.message };
    res.redirect('/admin/users');
  }
});

// POST /admin/users/:id/delete
router.post('/admin/users/:id/delete', requireAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (user) {
      req.session.flash = { type: 'success', message: `User "${user.username}" deleted.` };
    }
  } catch (err) {
    console.error('Delete user error:', err);
    req.session.flash = { type: 'danger', message: 'Failed to delete user.' };
  }
  res.redirect('/admin/users');
});

// GET /admin/orgs
router.get('/admin/orgs', requireAdmin, async (req, res) => {
  try {
    const orgs = await Organization.find().sort({ name: 1 });
    res.render('admin/orgs', { title: 'Manage Organisations', orgs, showForm: false, editOrg: null });
  } catch (err) {
    console.error('Admin orgs error:', err);
    res.render('admin/orgs', { title: 'Manage Organisations', orgs: [], showForm: false, editOrg: null });
  }
});

// GET /admin/orgs/new
router.get('/admin/orgs/new', requireAdmin, async (req, res) => {
  try {
    const orgs = await Organization.find().sort({ name: 1 });
    res.render('admin/orgs', { title: 'Manage Organisations', orgs, showForm: true, editOrg: null });
  } catch (err) {
    res.redirect('/admin/orgs');
  }
});

// POST /admin/orgs — create
router.post('/admin/orgs', requireAdmin, async (req, res) => {
  try {
    const { name, description } = req.body;
    await Organization.create({ name, description });
    req.session.flash = { type: 'success', message: `Organisation "${name}" created.` };
  } catch (err) {
    console.error('Create org error:', err);
    req.session.flash = { type: 'danger', message: 'Failed to create organisation: ' + err.message };
  }
  res.redirect('/admin/orgs');
});

// GET /admin/orgs/:id/edit
router.get('/admin/orgs/:id/edit', requireAdmin, async (req, res) => {
  try {
    const [orgs, editOrg] = await Promise.all([
      Organization.find().sort({ name: 1 }),
      Organization.findById(req.params.id)
    ]);
    if (!editOrg) {
      req.session.flash = { type: 'danger', message: 'Organisation not found.' };
      return res.redirect('/admin/orgs');
    }
    res.render('admin/orgs', { title: 'Edit Organisation', orgs, showForm: false, editOrg });
  } catch (err) {
    console.error('Edit org error:', err);
    res.redirect('/admin/orgs');
  }
});

// POST /admin/orgs/:id — update
router.post('/admin/orgs/:id', requireAdmin, async (req, res) => {
  try {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const description = typeof req.body.description === 'string' ? req.body.description.trim() : '';
    await Organization.findByIdAndUpdate(req.params.id, { name, description });
    req.session.flash = { type: 'success', message: 'Organisation updated.' };
  } catch (err) {
    console.error('Update org error:', err);
    req.session.flash = { type: 'danger', message: 'Failed to update organisation: ' + err.message };
  }
  res.redirect('/admin/orgs');
});

// POST /admin/orgs/:id/delete
router.post('/admin/orgs/:id/delete', requireAdmin, async (req, res) => {
  try {
    const org = await Organization.findByIdAndDelete(req.params.id);
    if (org) {
      req.session.flash = { type: 'success', message: `Organisation "${org.name}" deleted.` };
    }
  } catch (err) {
    console.error('Delete org error:', err);
    req.session.flash = { type: 'danger', message: 'Failed to delete organisation.' };
  }
  res.redirect('/admin/orgs');
});

module.exports = router;
