const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Basic middleware
app.use(cors());
app.use(express.json());

// Health check MUST be first
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Helpdesk API is running',
    timestamp: new Date().toISOString()
  });
});

// Simple root route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Helpdesk API Server', 
    health: '/api/health'
  });
});

// Import and use your routes (comment out if causing issues)
try {
  const ticketRoutes = require('./routes/tickets');
  const authRoutes = require('./routes/auth');
  const usersRoutes = require('./routes/users');
  
  app.use('/api/tickets', ticketRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/users', usersRoutes);
  
  console.log('✅ All routes loaded successfully');
} catch (error) {
  console.log('⚠️  Routes not loaded, but server will start:', error.message);
}

// Start server - SIMPLE VERSION
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`❤️  Health: http://localhost:${PORT}/api/health`);
});

module.exports = app;