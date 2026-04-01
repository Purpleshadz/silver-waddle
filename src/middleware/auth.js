function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.redirect('/login');
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.redirect('/login');
  }
  if (!['admin', 'lead_admin'].includes(req.session.role)) {
    return res.status(403).render('error', { message: 'Access denied', error: {} });
  }
  next();
}

function requireLeadAdmin(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.redirect('/login');
  }
  if (req.session.role !== 'lead_admin') {
    return res.status(403).render('error', { message: 'Access denied: Lead Admin only', error: {} });
  }
  next();
}

module.exports = { requireAuth, requireAdmin, requireLeadAdmin };
