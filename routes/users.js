const express = require('express');
const { db } = require('../database/init');
const jwt = require('jsonwebtoken');
const config = require('../config');

const router = express.Router();

const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid token' });
  }
};

// List users, optionally filtered by role (admin-only)
router.get('/', authenticateToken, (req, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { role } = req.query;
  let query = 'SELECT id, username, email, role FROM users';
  const params = [];
  if (role) {
    query += ' WHERE role = ?';
    params.push(role);
  }

  db.all(query, params, (err, users) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ users });
  });
});

module.exports = router;


