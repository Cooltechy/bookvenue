const express = require('express');
const bookingRuleService = require('../services/BookingRuleService');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get all active rules (public - for users to see what rules apply)
router.get('/active', async (req, res, next) => {
  try {
    const rules = await bookingRuleService.getActiveRules();
    const publicRules = rules.map(rule => ({
      name: rule.name,
      description: rule.description,
      type: rule.type
    }));
    res.json(publicRules);
  } catch (error) {
    next(error);
  }
});

// Validate a booking against rules (authenticated users)
router.post('/validate', authMiddleware, async (req, res, next) => {
  try {
    const { venueId, startTime, endTime } = req.body;
    const user = req.user;
    const existingBookings = [];

    const validation = await bookingRuleService.validateBooking(
      { venueId, startTime, endTime },
      user,
      existingBookings
    );

    res.json(validation);
  } catch (error) {
    next(error);
  }
});

// Admin routes
router.use(authMiddleware, adminMiddleware);

// Get all rules (admin)
router.get('/', async (req, res, next) => {
  try {
    const rules = await bookingRuleService.getAllRules();
    res.json(rules);
  } catch (error) {
    next(error);
  }
});

// Get rule by ID (admin)
router.get('/:id', async (req, res, next) => {
  try {
    const rule = await bookingRuleService.getRuleById(req.params.id);
    if (!rule) {
      return res.status(404).json({ error: 'Rule not found' });
    }
    res.json(rule);
  } catch (error) {
    next(error);
  }
});

// Create new rule (admin)
router.post('/', async (req, res, next) => {
  try {
    const rule = await bookingRuleService.createRule(req.body);
    res.status(201).json(rule);
  } catch (error) {
    next(error);
  }
});

// Update rule (admin)
router.put('/:id', async (req, res, next) => {
  try {
    const rule = await bookingRuleService.updateRule(req.params.id, req.body);
    if (!rule) {
      return res.status(404).json({ error: 'Rule not found' });
    }
    res.json(rule);
  } catch (error) {
    next(error);
  }
});

// Toggle rule active status (admin)
router.patch('/:id/toggle', async (req, res, next) => {
  try {
    const rule = await bookingRuleService.toggleRuleActive(req.params.id);
    if (!rule) {
      return res.status(404).json({ error: 'Rule not found' });
    }
    res.json(rule);
  } catch (error) {
    next(error);
  }
});

// Delete rule (admin)
router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await bookingRuleService.deleteRule(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Rule not found' });
    }
    res.json({ message: 'Rule deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Get rules by type (admin)
router.get('/type/:type', async (req, res, next) => {
  try {
    const rules = await bookingRuleService.getRulesByType(req.params.type);
    res.json(rules);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
