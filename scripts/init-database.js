const { initDatabase } = require('../database/init');

console.log('Initializing database...');
initDatabase()
  .then(() => {
    console.log('Database initialization complete!');
    console.log('\nDefault admin credentials:');
    console.log('Username: admin');
    console.log('Password: admin123');
    console.log('\nYou can now start the server with: npm start');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Database initialization failed:', error);
    process.exit(1);
  });
