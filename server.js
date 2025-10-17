// const express = require('express');
// const cors = require('cors');
// const bodyParser = require('body-parser');
// require('dotenv').config();

// const app = express();
// const PORT = process.env.PORT || 5000;

// // Basic middleware
// app.use(cors());
// app.use(express.json());

// // Health check MUST be first
// app.get('/api/health', (req, res) => {
//   res.json({ 
//     status: 'OK', 
//     message: 'Helpdesk API is running',
//     timestamp: new Date().toISOString()
//   });
// });

// // Simple root route
// app.get('/', (req, res) => {
//   res.json({ 
//     message: 'Helpdesk API Server', 
//     health: '/api/health'
//   });
// });

// // Import and use your routes (comment out if causing issues)
// try {
//   const ticketRoutes = require('./routes/tickets');
//   const authRoutes = require('./routes/auth');
//   const usersRoutes = require('./routes/users');
  
//   app.use('/api/tickets', ticketRoutes);
//   app.use('/api/auth', authRoutes);
//   app.use('/api/users', usersRoutes);
  
//   console.log('✅ All routes loaded successfully');
// } catch (error) {
//   console.log('⚠️  Routes not loaded, but server will start:', error.message);
// }

// // Start server - SIMPLE VERSION
// app.listen(PORT, () => {
//   console.log(`🚀 Server running on port ${PORT}`);
//   console.log(`❤️  Health: http://localhost:${PORT}/api/health`);
// });

// module.exports = app;

// server.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// ---------------------- Middleware ----------------------
app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ---------------------- Database Setup ----------------------
const sqlite3 = require('sqlite3').verbose();
const dbPath = path.resolve(__dirname, 'helpdesk.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Could not connect to SQLite database:', err.message);
  } else {
    console.log('✅ Connected to SQLite database');
  }
});

// Create default tables if not exist
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    description TEXT,
    status TEXT DEFAULT 'open',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Create default admin user if not exists
  db.get("SELECT * FROM users WHERE username = 'admin'", (err, row) => {
    if (!row) {
      db.run("INSERT INTO users (username, password) VALUES (?, ?)", ['admin', 'admin123']);
      console.log('✅ Default admin user created (username: admin, password: admin123)');
    }
  });

  console.log('✅ Database tables initialized');
});

// ---------------------- Routes ----------------------

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Helpdesk API is running',
    timestamp: new Date().toISOString(),
  });
});

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Helpdesk API Server',
    health: '/api/health',
  });
});

// Load your route modules safely
try {
  const ticketRoutes = require('./routes/tickets');
  const authRoutes = require('./routes/auth');
  const usersRoutes = require('./routes/users');

  app.use('/api/tickets', ticketRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/users', usersRoutes);

  console.log('✅ All routes loaded successfully');
} catch (error) {
  console.warn('⚠️ Routes not loaded, but server will start:', error.message);
}

// ---------------------- Start Server ----------------------
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`❤️ Health: http://0.0.0.0:${PORT}/api/health`);
});

// Export app for testing (optional)
module.exports = app;
