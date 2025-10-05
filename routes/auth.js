const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../database/init');
const config = require('../config');
const { body, validationResult } = require('express-validator');
const { promisify } = require('util');

const router = express.Router();

// Promisify sqlite3 callbacks
const dbGet = promisify(db.get.bind(db));
const dbRun = function(sql, params) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
};

// Basic rate limiter for auth endpoints (simple in-memory fallback)
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 20;
const attempts = new Map();

function authLimiter(req, res, next) {
  try {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    const entry = attempts.get(ip) || { count: 0, start: now };
    if (now - entry.start > RATE_LIMIT_WINDOW_MS) {
      entry.count = 1;
      entry.start = now;
    } else {
      entry.count += 1;
    }
    attempts.set(ip, entry);
    if (entry.count > RATE_LIMIT_MAX) {
      return res.status(429).json({ error: 'Too many requests, please try again later.' });
    }
    next();
  } catch (e) {
    next();
  }
}

if (!config || !config.JWT_SECRET) {
  // Fail fast in dev if secret missing
  console.error('JWT_SECRET is not set in config. Set it via environment variable.');
}

/**
 * Login endpoint
 * - Accepts username or email plus password
 * - Returns JWT (also sets HttpOnly cookie in production)
 */
router.post(
  '/login',
  authLimiter,
  [
    body('username').trim().notEmpty().withMessage('Username or email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;

    try {
      const user = await dbGet(
        'SELECT * FROM users WHERE username = ? OR email = ?',
        [username, username]
      );

      // Generic message to avoid user enumeration
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        config.JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Set HttpOnly cookie in production (safer)
      if (process.env.NODE_ENV === 'production') {
        res.cookie('token', token, {
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
          maxAge: 24 * 60 * 60 * 1000,
        });
      }

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Register endpoint
router.post(
  '/register',
  authLimiter,
  [
    body('username')
      .trim()
      .isLength({ min: 3 })
      .withMessage('Username must be at least 3 characters'),
    body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password } = req.body;

    try {
      const hashedPassword = await bcrypt.hash(password, 10);

      const result = await dbRun(
        'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
        [username, email, hashedPassword]
      );

      const userId = result.lastID;

      const token = jwt.sign(
        { id: userId, username, role: 'user' },
        config.JWT_SECRET,
        { expiresIn: '24h' }
      );

      if (process.env.NODE_ENV === 'production') {
        res.cookie('token', token, {
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
          maxAge: 24 * 60 * 60 * 1000,
        });
      }

      res.status(201).json({
        token,
        user: {
          id: userId,
          username,
          email,
          role: 'user'
        }
      });
    } catch (err) {
      console.error('Register error:', err);
      if (err.message && err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: 'Username or email already exists' });
      }
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Verify token endpoint
router.get('/verify', authLimiter, (req, res) => {
  const header = req.headers.authorization || (req.cookies && req.cookies.token);
  const token = header?.startsWith('Bearer ') ? header.split(' ')[1] : header;

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    res.json({ valid: true, user: decoded });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
});

module.exports = router;
