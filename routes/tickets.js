const express = require('express');
const { db } = require('../database/init');
const jwt = require('jsonwebtoken');
const config = require('../config');

const router = express.Router();

// Middleware to verify JWT token
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

// Get all tickets
router.get('/', authenticateToken, (req, res) => {
  const { status, priority, page = 1, limit = 10 } = req.query;
  let query = `
    SELECT t.*, 
           u1.username as created_by_username,
           u2.username as assigned_to_username
    FROM tickets t
    LEFT JOIN users u1 ON t.created_by = u1.id
    LEFT JOIN users u2 ON t.assigned_to = u2.id
  `;
  
  const conditions = [];
  const params = [];

  if (status) {
    conditions.push('t.status = ?');
    params.push(status);
  }

  if (priority) {
    conditions.push('t.priority = ?');
    params.push(priority);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY t.created_at DESC';

  // Add pagination
  const offset = (page - 1) * limit;
  query += ` LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), offset);

  db.all(query, params, (err, tickets) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) as total FROM tickets t';
    if (conditions.length > 0) {
      countQuery += ' WHERE ' + conditions.join(' AND ');
    }

    db.get(countQuery, params.slice(0, -2), (err, countResult) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      res.json({
        tickets,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult.total,
          pages: Math.ceil(countResult.total / limit)
        }
      });
    });
  });
});

// Get single ticket
router.get('/:id', authenticateToken, (req, res) => {
  const ticketId = req.params.id;

  db.get(`
    SELECT t.*, 
           u1.username as created_by_username,
           u1.email as created_by_email,
           u2.username as assigned_to_username,
           u2.email as assigned_to_email
    FROM tickets t
    LEFT JOIN users u1 ON t.created_by = u1.id
    LEFT JOIN users u2 ON t.assigned_to = u2.id
    WHERE t.id = ?
  `, [ticketId], (err, ticket) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Get comments for this ticket
    db.all(`
      SELECT c.*, u.username as author_username
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.ticket_id = ?
      ORDER BY c.created_at ASC
    `, [ticketId], (err, comments) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      res.json({ ...ticket, comments });
    });
  });
});

// Create new ticket
router.post('/', authenticateToken, (req, res) => {
  const { title, description, priority = 'medium', category } = req.body;

  if (!title || !description) {
    return res.status(400).json({ error: 'Title and description are required' });
  }

  db.run(`
    INSERT INTO tickets (title, description, priority, category, created_by)
    VALUES (?, ?, ?, ?, ?)
  `, [title, description, priority, category, req.user.id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    res.status(201).json({
      id: this.lastID,
      title,
      description,
      priority,
      category,
      status: 'open',
      created_by: req.user.id,
      message: 'Ticket created successfully'
    });
  });
});

// Update ticket
router.put('/:id', authenticateToken, (req, res) => {
  const ticketId = req.params.id;
  const { title, description, status, priority, category, assigned_to } = req.body;

  const updates = [];
  const params = [];

  if (title !== undefined) {
    updates.push('title = ?');
    params.push(title);
  }
  if (description !== undefined) {
    updates.push('description = ?');
    params.push(description);
  }
  if (status !== undefined) {
    updates.push('status = ?');
    params.push(status);
  }
  if (priority !== undefined) {
    updates.push('priority = ?');
    params.push(priority);
  }
  if (category !== undefined) {
    updates.push('category = ?');
    params.push(category);
  }
  if (assigned_to !== undefined) {
    updates.push('assigned_to = ?');
    params.push(assigned_to);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(ticketId);

  db.run(`
    UPDATE tickets 
    SET ${updates.join(', ')}
    WHERE id = ?
  `, params, function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    res.json({ message: 'Ticket updated successfully' });
  });
});

// Add comment to ticket
router.post('/:id/comments', authenticateToken, (req, res) => {
  const ticketId = req.params.id;
  const { content } = req.body;

  if (!content) {
    return res.status(400).json({ error: 'Comment content is required' });
  }

  db.run(`
    INSERT INTO comments (ticket_id, user_id, content)
    VALUES (?, ?, ?)
  `, [ticketId, req.user.id, content], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    res.status(201).json({
      id: this.lastID,
      ticket_id: ticketId,
      user_id: req.user.id,
      content,
      message: 'Comment added successfully'
    });
  });
});

// Delete ticket
router.delete('/:id', authenticateToken, (req, res) => {
  const ticketId = req.params.id;

  db.run('DELETE FROM tickets WHERE id = ?', [ticketId], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    res.json({ message: 'Ticket deleted successfully' });
  });
});

module.exports = router;
