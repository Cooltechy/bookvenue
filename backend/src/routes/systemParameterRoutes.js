const express = require('express');
const SystemParameterRepository = require('../repositories/SystemParameterRepository');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

// Public endpoint to get minimum advance booking days
router.get('/min-advance-booking-days', async (req, res, next) => {
  try {
    const DEFAULT_DAYS = 10;
    let minDays = DEFAULT_DAYS;
    
    try {
      const parameter = await SystemParameterRepository.findByKey('MIN_ADVANCE_BOOKING_DAYS');
      if (parameter && parameter.value) {
        const parsedValue = parseInt(parameter.value, 10);
        if (!isNaN(parsedValue) && parsedValue >= 0) {
          minDays = parsedValue;
        }
      }
    } catch (error) {
      // Use default if parameter doesn't exist
      console.log('Using default minimum advance booking days:', minDays);
    }
    
    // Calculate the minimum valid booking date
    const today = new Date();
    const minDate = new Date(today);
    minDate.setDate(minDate.getDate() + minDays);
    
    res.status(200).json({
      minAdvanceDays: minDays,
      minDate: minDate.toISOString().split('T')[0],
      today: today.toISOString().split('T')[0]
    });
  } catch (error) {
    next(error);
  }
});

router.get('/', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    // Return all system parameters
    res.status(200).json([]);
  } catch (error) {
    next(error);
  }
});

router.put('/:key', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    const parameter = await SystemParameterRepository.updateByKey(key, value);
    res.status(200).json(parameter);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
