require('dotenv').config();
const crypto = require('crypto');
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const ejsLayouts = require('express-ejs-layouts');
const rateLimit = require('express-rate-limit');
const path = require('path');

const { connectDB } = require('./src/config/db');
const User = require('./src/models/User');

const authRoutes = require('./src/routes/auth');
const dashboardRoutes = require('./src/routes/dashboard');
const adminRoutes = require('./src/routes/admin');
const dataRoutes = require('./src/routes/data');

const app = express();

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(ejsLayouts);
app.set('layout', 'layout');

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Session
app.use(session({
  secret: process.env.SESSION_SECRET || 'changeme',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 24, // 24 hours
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production'
  }
}));

// General rate limiter — applied to all routes
app.use(rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests, please try again later.'
}));

// CSRF protection — synchronizer token pattern
app.use((req, res, next) => {
  // Generate a token for this session if one doesn't exist
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  res.locals.csrfToken = req.session.csrfToken;

  // Verify token on state-changing requests, excluding JSON API routes
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && !req.path.startsWith('/api/')) {
    const token = req.body._csrf || req.headers['x-csrf-token'];
    if (!token || token !== req.session.csrfToken) {
      return res.status(403).render('error', { message: 'Invalid or missing CSRF token.', error: {} });
    }
  }
  next();
});

// Flash middleware
app.use((req, res, next) => {
  res.locals.flash = req.session.flash || null;
  delete req.session.flash;
  next();
});

// Set res.locals for user/org context
app.use(async (req, res, next) => {
  try {
    if (req.session && req.session.userId) {
      res.locals.user = {
        id: req.session.userId,
        username: req.session.username,
        role: req.session.role
      };
      res.locals.activeOrg = req.session.activeOrg || null;

      // Load user's organisations
      const user = await User.findById(req.session.userId).populate('organizations').lean();
      res.locals.userOrgs = user ? user.organizations.map(o => ({ _id: o._id, name: o.name })) : [];

      // Find active org object
      if (res.locals.activeOrg) {
        res.locals.activeOrgObj = res.locals.userOrgs.find(
          o => o._id.toString() === res.locals.activeOrg
        ) || null;
      } else {
        res.locals.activeOrgObj = null;
      }
    } else {
      res.locals.user = null;
      res.locals.activeOrg = null;
      res.locals.userOrgs = [];
      res.locals.activeOrgObj = null;
    }
  } catch (err) {
    // DB may not be ready yet
    res.locals.user = null;
    res.locals.activeOrg = null;
    res.locals.userOrgs = [];
    res.locals.activeOrgObj = null;
  }
  next();
});

// Routes
app.use('/', authRoutes);
app.use('/', dashboardRoutes);
app.use('/', adminRoutes);
app.use('/', dataRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).render('error', { message: 'Page not found', error: {} });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).render('error', {
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV !== 'production' ? err : {}
  });
});

const PORT = process.env.PORT || 3000;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('Failed to connect to MongoDB:', err);
    process.exit(1);
  });

module.exports = app;
