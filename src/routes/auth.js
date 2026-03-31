const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const User = require('../models/User');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: 'Too many login attempts. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

// GET /login
router.get('/login', (req, res) => {
  if (req.session && req.session.userId) {
    return res.redirect('/');
  }
  res.render('login', { title: 'Login' });
});

// POST /login
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const username = typeof req.body.username === 'string' ? req.body.username.trim() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    if (!username || !password) {
      req.session.flash = { type: 'danger', message: 'Username and password are required.' };
      return res.redirect('/login');
    }

    const user = await User.findOne({ username: { $eq: username } }).populate('organizations');
    if (!user || !(await user.comparePassword(password))) {
      req.session.flash = { type: 'danger', message: 'Invalid username or password.' };
      return res.redirect('/login');
    }

    req.session.userId = user._id.toString();
    req.session.username = user.username;
    req.session.role = user.role;
    req.session.activeOrg = user.organizations.length > 0
      ? user.organizations[0]._id.toString()
      : null;

    res.redirect('/');
  } catch (err) {
    console.error('Login error:', err);
    req.session.flash = { type: 'danger', message: 'An error occurred during login.' };
    res.redirect('/login');
  }
});

// POST /logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

module.exports = router;
