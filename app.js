// app.js - Minimal working server for Render
const express = require('express');
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());

// Health check - REQUIRED for Render
app.get('/api/health', (req, res) => {
  console.log('Health check called');
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Root route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Helpdesk API Server is Running!',
    health: '/api/health'
  });
});

// Start server - CRITICAL: No host parameter
const server = app.listen(PORT, () => {
  console.log(`✅ Server successfully bound to port ${PORT}`);
  console.log(`✅ Ready to accept connections on port ${PORT}`);
});

module.exports = app;