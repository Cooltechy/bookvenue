const express = require('express');
const cors = require('cors');
const userRoutes = require('./routes/users');
const authMiddleware = require('./middleware/auth');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'University DB API is running' });
});

// Protected routes
app.use('/api/users', authMiddleware, userRoutes);

module.exports = app;
