const express = require('express');
const bookingService = require('../services/BookingService');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.post('/', authMiddleware, upload.single('permissionDocument'), async (req, res, next) => {
  try {
    const { venueId, date, startTime, endTime, purpose } = req.body;
    
    if (!venueId || !date || !startTime || !endTime) {
      return res.status(400).json({ message: 'Missing required fields: venueId, date, startTime, endTime' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Permission document is required. Please upload a PDF, DOC, DOCX, JPG, JPEG, or PNG file.' });
    }
    
    const booking = await bookingService.createBooking(
      req.user.id,
      venueId,
      date,
      startTime,
      endTime,
      purpose,
      req.file
    );
    res.status(201).json(booking);
  } catch (error) {
    next(error);
  }
});

// Get available slots for a venue on a specific date (public endpoint)
router.get('/availability/:venueId', async (req, res, next) => {
  try {
    const { venueId } = req.params;
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({ message: 'Date query parameter is required' });
    }
    
    const slots = await bookingService.getAvailableSlots(venueId, date);
    res.status(200).json(slots);
  } catch (error) {
    next(error);
  }
});

// Check if a specific slot is available (with conflict details)
router.post('/check-availability', authMiddleware, async (req, res, next) => {
  try {
    const { venueId, date, startTime, endTime } = req.body;
    
    if (!venueId || !date || !startTime || !endTime) {
      return res.status(400).json({ message: 'Missing required fields: venueId, date, startTime, endTime' });
    }
    
    const availability = await bookingService.checkSlotAvailability(
      req.user.id,
      venueId,
      date,
      startTime,
      endTime
    );
    res.status(200).json(availability);
  } catch (error) {
    next(error);
  }
});

// Add booking to priority queue
router.post('/queue/add', authMiddleware, async (req, res, next) => {
  try {
    const { venueId, date, startTime } = req.body;
    const result = await bookingService.addToQueue(
      req.user.id,
      venueId,
      date,
      startTime
    );
    res.status(202).json(result);
  } catch (error) {
    next(error);
  }
});

// Get queue status for a venue
router.get('/queue/status/:venueId', async (req, res, next) => {
  try {
    const { venueId } = req.params;
    const status = bookingService.getQueueStatus(venueId);
    res.status(200).json(status);
  } catch (error) {
    next(error);
  }
});

// Get user's position in queue
router.get('/queue/position/:venueId', authMiddleware, async (req, res, next) => {
  try {
    const { venueId } = req.params;
    const position = bookingService.getUserQueuePosition(venueId, req.user.id);
    res.status(200).json(position);
  } catch (error) {
    next(error);
  }
});

// Process next booking from queue (admin only)
router.post('/queue/process/:venueId', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const { venueId } = req.params;
    const result = await bookingService.processNextBooking(venueId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

// Get all queues status (admin only)
router.get('/queue/all-status', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const status = bookingService.getAllQueuesStatus();
    res.status(200).json(status);
  } catch (error) {
    next(error);
  }
});

// Check for double booking before booking
router.post('/check-double-booking', authMiddleware, async (req, res, next) => {
  try {
    const { startTime, endTime } = req.body;
    const result = await bookingService.checkUserDoubleBooking(
      req.user.id,
      new Date(startTime),
      new Date(endTime)
    );
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

// Get user's active bookings
router.get('/my-bookings', authMiddleware, async (req, res, next) => {
  try {
    const bookings = await bookingService.getUserActiveBookings(req.user.id);
    res.status(200).json(bookings);
  } catch (error) {
    next(error);
  }
});

router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const bookings = await bookingService.getUserBookings(req.user.id);
    res.status(200).json(bookings);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const booking = await bookingService.getBookingById(req.params.id);
    res.status(200).json(booking);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    const booking = await bookingService.cancelBooking(req.params.id);
    res.status(200).json(booking);
  } catch (error) {
    next(error);
  }
});

// Download permission document
router.get('/:id/permission-document', authMiddleware, async (req, res, next) => {
  try {
    const booking = await bookingService.getBookingById(req.params.id);
    
    // Check if user is authorized to view this document
    // booking.userId might be populated (object) or just an ID
    const bookingUserId = booking.userId._id ? booking.userId._id.toString() : booking.userId.toString();
    if (bookingUserId !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ message: 'You are not authorized to view this document' });
    }

    if (!booking.permissionDocument || !booking.permissionDocument.path) {
      return res.status(404).json({ message: 'Permission document not found' });
    }

    const fs = require('fs');
    const path = require('path');
    
    const filePath = path.resolve(booking.permissionDocument.path);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Permission document file not found on server' });
    }

    // Set appropriate headers
    res.setHeader('Content-Type', booking.permissionDocument.mimetype);
    res.setHeader('Content-Disposition', `inline; filename="${booking.permissionDocument.filename}"`);
    
    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    next(error);
  }
});

// Approve a booking (admin only)
router.put('/:id/approve', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const booking = await bookingService.approveBooking(req.params.id, req.user.id);
    res.status(200).json(booking);
  } catch (error) {
    next(error);
  }
});

// Reject a booking (admin only)
router.put('/:id/reject', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const { rejectionReason } = req.body;
    const booking = await bookingService.rejectBooking(req.params.id, req.user.id, rejectionReason);
    res.status(200).json(booking);
  } catch (error) {
    next(error);
  }
});

// Get pending bookings (admin only)
router.get('/admin/pending', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const bookings = await bookingService.getPendingApprovalBookings(req.user.id);
    res.status(200).json(bookings);
  } catch (error) {
    next(error);
  }
});

// Get payment pending bookings (admin only)
router.get('/admin/payment-pending', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const bookings = await bookingService.getPaymentPendingBookings();
    res.status(200).json(bookings);
  } catch (error) {
    next(error);
  }
});

// Submit payment for approved booking
router.post('/:id/payment', authMiddleware, upload.single('paymentProof'), async (req, res, next) => {
  try {
    const { transactionId, paymentMethod } = req.body;
    
    const result = await bookingService.submitPayment(
      req.params.id,
      req.user.id,
      { transactionId, paymentMethod },
      req.file
    );
    
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

// Get bookings by status (admin only)
router.get('/admin/status/:status', authMiddleware, adminMiddleware, async (req, res, next) => {
  try {
    const bookings = await bookingService.getBookingsByStatus(req.params.status);
    res.status(200).json(bookings);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
