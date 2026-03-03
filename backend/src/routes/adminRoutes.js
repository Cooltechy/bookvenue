const express = require('express');
const bookingService = require('../services/BookingService');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/bookings', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const bookings = await bookingService.getAllBookings();
    res.status(200).json(bookings);
  } catch (error) {
    next(error);
  }
});

router.delete('/bookings/:id', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const booking = await bookingService.cancelBooking(req.params.id);
    res.status(200).json(booking);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
