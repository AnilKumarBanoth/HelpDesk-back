const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'helpdesk.db');

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');
  }
});

// Initialize database tables
const initDatabase = () => {
  return new Promise((resolve, reject) => {
    // Users table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) {
        console.error('Error creating users table:', err.message);
        reject(err);
        return;
      }
      
      // Tickets table
      db.run(`
        CREATE TABLE IF NOT EXISTS tickets (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          status TEXT DEFAULT 'open',
          priority TEXT DEFAULT 'medium',
          category TEXT,
          assigned_to INTEGER,
          created_by INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (assigned_to) REFERENCES users (id),
          FOREIGN KEY (created_by) REFERENCES users (id)
        )
      `, (err) => {
        if (err) {
          console.error('Error creating tickets table:', err.message);
          reject(err);
          return;
        }
        
        // Comments table
        db.run(`
          CREATE TABLE IF NOT EXISTS comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ticket_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (ticket_id) REFERENCES tickets (id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users (id)
          )
        `, (err) => {
          if (err) {
            console.error('Error creating comments table:', err.message);
            reject(err);
            return;
          }
          
          // Insert default admin user
          const bcrypt = require('bcryptjs');
          const hashedPassword = bcrypt.hashSync('admin123', 10);
          
          db.run(`
            INSERT OR IGNORE INTO users (username, email, password, role) 
            VALUES ('admin', 'admin@helpdesk.com', ?, 'admin')
          `, [hashedPassword], function(err) {
            if (err) {
              console.log('Admin user already exists or error:', err.message);
            } else {
              console.log('Default admin user created (username: admin, password: admin123)');
            }
            console.log('Database tables initialized');
            resolve();
          });
        });
      });
    });
  });
};

module.exports = { db, initDatabase };