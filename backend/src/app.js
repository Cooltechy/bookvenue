const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const venueRoutes = require('./routes/venueRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const systemParameterRoutes = require('./routes/systemParameterRoutes');
const reportRoutes = require('./routes/reportRoutes');
const adminRoutes = require('./routes/adminRoutes');
const bookingRuleRoutes = require('./routes/bookingRuleRoutes');
const superAdminRoutes = require('./routes/superAdminRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/auth', authRoutes);
app.use('/venues', venueRoutes);
app.use('/bookings', bookingRoutes);
app.use('/notifications', notificationRoutes);
app.use('/admin/parameters', systemParameterRoutes);
app.use('/admin/reports', reportRoutes);
app.use('/admin', adminRoutes);
app.use('/api/booking-rules', bookingRuleRoutes);
app.use('/super-admin', superAdminRoutes);

// Error handling
app.use(errorHandler);

module.exports = app;
