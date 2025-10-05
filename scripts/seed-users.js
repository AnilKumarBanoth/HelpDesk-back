const { db } = require('../database/init');
const bcrypt = require('bcryptjs');

async function run() {
  const users = [
    { username: 'agent', email: 'agent@helpdesk.com', password: 'agent123', role: 'agent' },
    { username: 'customer', email: 'customer@helpdesk.com', password: 'customer123', role: 'user' },
  ];

  for (const u of users) {
    await new Promise((resolve) => {
      db.get('SELECT id FROM users WHERE email = ? OR username = ?', [u.email, u.username], (err, row) => {
        if (err) {
          console.error('Lookup error:', err.message);
          return resolve();
        }
        if (row) {
          console.log(`User already exists: ${u.username} (${u.email})`);
          return resolve();
        }
        const hashed = bcrypt.hashSync(u.password, 10);
        db.run(
          'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
          [u.username, u.email, hashed, u.role],
          function(insertErr) {
            if (insertErr) {
              console.error('Insert error:', insertErr.message);
            } else {
              console.log(`Created user: ${u.username} / ${u.email}`);
            }
            resolve();
          }
        );
      });
    });
  }

  console.log('Seeding complete.');
  process.exit(0);
}

run().catch((e) => { console.error(e); process.exit(1); });
