const bookingRepository = require('../repositories/BookingRepository');
const venueRepository = require('../repositories/VenueRepository');
const userRepository = require('../repositories/UserRepository');
const bookingQueueRepository = require('../repositories/BookingQueueRepository');
const systemParameterRepository = require('../repositories/SystemParameterRepository');
const notificationService = require('./NotificationService');
const { ValidationError, NotFoundError, ConflictError } = require('../utils/errors');

class BookingService {
  // Minimum slot duration
  MIN_SLOT_DURATION_HOURS = 1;
  // Default minimum advance booking days (can be overridden by system parameter)
  DEFAULT_MIN_ADVANCE_BOOKING_DAYS = 10;

  // Calculate price based on duration
  calculatePrice(venue, durationHours) {
    let price;
    let pricingType;

    // Validate venue has pricing information
    if (!venue.halfDayPrice || !venue.fullDayPrice) {
      throw new ValidationError(
        `Venue pricing information is missing. Please contact administrator. ` +
        `(halfDayPrice: ${venue.halfDayPrice}, fullDayPrice: ${venue.fullDayPrice})`
      );
    }

    if (durationHours > 5) {
      // Full day pricing for more than 5 hours
      price = venue.fullDayPrice;
      pricingType = 'full-day';
    } else if (durationHours >= 1) {
      // Half day pricing for 1-5 hours
      price = venue.halfDayPrice;
      pricingType = 'half-day';
    } else {
      throw new ValidationError('Minimum booking duration is 1 hour');
    }

    return { price, pricingType };
  }

  async createBooking(userId, venueId, date, startTime, endTime, purpose = '', permissionDocument = null) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const venue = await venueRepository.findById(venueId);
    if (!venue) {
      throw new NotFoundError('Venue not found');
    }

    // Validate permission document is provided
    if (!permissionDocument) {
      throw new ValidationError('Written permission document from department is required');
    }

    // Parse date and times
    const bookingDate = new Date(date);
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);

    const startDateTime = new Date(bookingDate);
    startDateTime.setHours(startHours, startMinutes, 0, 0);

    const endDateTime = new Date(bookingDate);
    endDateTime.setHours(endHours, endMinutes, 0, 0);

    // If end time is before start time, assume it's next day
    if (endDateTime <= startDateTime) {
      endDateTime.setDate(endDateTime.getDate() + 1);
    }

    // Calculate duration in hours
    const durationMs = endDateTime - startDateTime;
    const durationHours = durationMs / (1000 * 60 * 60);

    // Validate minimum duration
    if (durationHours < this.MIN_SLOT_DURATION_HOURS) {
      throw new ValidationError(`Minimum booking duration is ${this.MIN_SLOT_DURATION_HOURS} hour(s)`);
    }

    // Validate start time is in the future
    const now = new Date();
    if (startDateTime <= now) {
      throw new ValidationError('Cannot book a time slot in the past');
    }

    // Get minimum advance booking days from system parameters (default: 10 days)
    let minAdvanceDays = this.DEFAULT_MIN_ADVANCE_BOOKING_DAYS;
    try {
      const advanceBookingParam = await systemParameterRepository.findByKey('MIN_ADVANCE_BOOKING_DAYS');
      if (advanceBookingParam && advanceBookingParam.value) {
        const parsedValue = parseInt(advanceBookingParam.value, 10);
        if (!isNaN(parsedValue) && parsedValue >= 0) {
          minAdvanceDays = parsedValue;
        }
      }
    } catch (error) {
      // If parameter doesn't exist or error occurs, use default value
      console.log('Using default minimum advance booking days:', minAdvanceDays);
    }

    // Validate advance booking requirement
    const minAdvanceBookingDate = new Date(now);
    minAdvanceBookingDate.setDate(minAdvanceBookingDate.getDate() + minAdvanceDays);

    if (startDateTime < minAdvanceBookingDate) {
      const daysUntilBooking = Math.ceil((startDateTime - now) / (1000 * 60 * 60 * 24));
      throw new ValidationError(
        `Bookings must be made at least ${minAdvanceDays} day(s) in advance. Your booking is only ${daysUntilBooking} day(s) in advance. Please select a date on or after ${minAdvanceBookingDate.toISOString().split('T')[0]}.`
      );
    }

    // Check for double booking - user cannot have overlapping APPROVED/CONFIRMED bookings
    const userBookings = await bookingRepository.findByUserId(userId);
    const hasUserConflict = userBookings.some(booking => {
      if (booking.status === 'cancelled' || booking.status === 'rejected' || booking.status === 'pending_approval') return false;
      // Only check against payment_pending and payment_completed bookings
      return startDateTime < booking.endTime && endDateTime > booking.startTime;
    });

    if (hasUserConflict) {
      throw new ConflictError(
        `You already have an approved/confirmed booking during this time. Please choose a different time slot.`
      );
    }

    // Check for conflicts with APPROVED/CONFIRMED bookings at this venue
    // Allow multiple pending_approval requests for the same slot
    const hasVenueConflict = await bookingRepository.checkConflict(
      venueId,
      startDateTime,
      endDateTime,
      null,
      ['payment_pending', 'payment_completed'] // Only check against approved/confirmed bookings
    );
    if (hasVenueConflict) {
      throw new ConflictError(
        `This time slot is already confirmed by another booking`
      );
    }

    // Calculate price based on duration
    const { price, pricingType } = this.calculatePrice(venue, durationHours);

    const booking = await bookingRepository.create({
      userId,
      venueId,
      startTime: startDateTime,
      endTime: endDateTime,
      date: bookingDate.toISOString().split('T')[0],
      purpose: purpose || 'Not specified',
      permissionDocument: {
        filename: permissionDocument.originalname,
        path: permissionDocument.path,
        mimetype: permissionDocument.mimetype,
        size: permissionDocument.size,
        uploadedAt: new Date()
      },
      price,
      durationHours,
      pricingType,
      currency: venue.currency || 'INR',
      status: 'pending_approval',
      workflowStage: 'submitted',
      paymentStatus: 'not_required' // Will change to 'pending' after admin approval
    });

    // Send notification to user
    await notificationService.sendPaymentRequiredNotification(booking);

    // Notify admins
    await notificationService.notifyAdminsOfBookingRequest(booking);

    return {
      booking,
      message: 'Booking submitted successfully. Your booking is pending admin approval. You will be notified once the admin reviews your request.'
    };
  }

  async sendBookingSubmittedNotification(booking) {
    // Handled by direct call to notificationService in createBooking
  }

  // Check if a slot is available and return conflict info if not
  async checkSlotAvailability(userId, venueId, date, startTime, endTime) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const venue = await venueRepository.findById(venueId);
    if (!venue) {
      throw new NotFoundError('Venue not found');
    }

    // Parse date and times
    const bookingDate = new Date(date);
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);

    const startDateTime = new Date(bookingDate);
    startDateTime.setHours(startHours, startMinutes, 0, 0);

    const endDateTime = new Date(bookingDate);
    endDateTime.setHours(endHours, endMinutes, 0, 0);

    // If end time is before start time, assume it's next day
    if (endDateTime <= startDateTime) {
      endDateTime.setDate(endDateTime.getDate() + 1);
    }

    // Calculate duration and pricing
    const durationMs = endDateTime - startDateTime;
    const durationHours = durationMs / (1000 * 60 * 60);
    const { price, pricingType } = this.calculatePrice(venue, durationHours);

    // Check for user's own overlapping APPROVED/CONFIRMED bookings
    const userBookings = await bookingRepository.findByUserId(userId);
    const userConflict = userBookings.find(booking => {
      if (booking.status === 'cancelled' || booking.status === 'rejected' || booking.status === 'pending_approval') return false;
      return startDateTime < booking.endTime && endDateTime > booking.startTime;
    });

    if (userConflict) {
      return {
        available: false,
        reason: 'user_conflict',
        message: 'You already have an approved/confirmed booking during this time. Please choose a different time slot.'
      };
    }

    // Check for venue conflicts with APPROVED/CONFIRMED bookings only
    const venueConflict = await bookingRepository.checkConflict(
      venueId,
      startDateTime,
      endDateTime,
      null,
      ['payment_pending', 'payment_completed']
    );

    if (venueConflict) {
      return {
        available: false,
        reason: 'venue_conflict',
        message: `This time slot is already confirmed. Please select another time slot or venue.`,
        startTime: startDateTime,
        endTime: endDateTime
      };
    }

    // Check if user has pending requests for this slot
    const pendingRequests = userBookings.filter(booking => {
      if (booking.status !== 'pending_approval') return false;
      return startDateTime < booking.endTime && endDateTime > booking.startTime;
    });

    if (pendingRequests.length > 0) {
      return {
        available: true,
        hasPendingRequest: true,
        message: 'You already have a pending request for this time slot. You can submit another request, but only one will be approved.',
        durationHours,
        price,
        pricingType,
        currency: venue.currency || 'INR'
      };
    }

    return {
      available: true,
      message: 'Time slot is available',
      durationHours,
      price,
      pricingType,
      currency: venue.currency || 'INR'
    };
  }

  async getBookingById(id) {
    const booking = await bookingRepository.findById(id);
    if (!booking) {
      throw new NotFoundError('Booking not found');
    }
    return booking;
  }

  async getUserBookings(userId) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return bookingRepository.findByUserId(userId);
  }

  async getAllBookings() {
    return bookingRepository.findAll();
  }

  async getBookingsByVenue(venueId) {
    const venue = await venueRepository.findById(venueId);
    if (!venue) {
      throw new NotFoundError('Venue not found');
    }
    return bookingRepository.findByVenueId(venueId);
  }

  async searchBookings(filters) {
    return bookingRepository.findWithFilters(filters);
  }

  async cancelBooking(bookingId) {
    const booking = await this.getBookingById(bookingId);
    if (booking.status === 'cancelled') {
      throw new ValidationError('Booking is already cancelled');
    }

    const cancelled = await bookingRepository.cancel(bookingId);
    if (!cancelled) {
      throw new NotFoundError('Booking not found');
    }
    return cancelled;
  }

  async checkConflict(venueId, startTime, endTime) {
    return bookingRepository.checkConflict(venueId, startTime, endTime);
  }

  async validateAdvanceNotice(bookingDate) {
    const advanceNoticeDays = parseInt(process.env.ADVANCE_NOTICE_DAYS || '7', 10);
    const minBookingDate = new Date();
    minBookingDate.setDate(minBookingDate.getDate() + advanceNoticeDays);
    return bookingDate >= minBookingDate;
  }

  async getAvailableSlots(venueId, date) {
    const venue = await venueRepository.findById(venueId);
    if (!venue) {
      throw new NotFoundError('Venue not found');
    }

    // Get all confirmed bookings for this venue
    const bookings = await bookingRepository.findConfirmedByVenueId(venueId);
    const dateStr = new Date(date).toISOString().split('T')[0];

    // Filter bookings for the specific date
    const dayBookings = bookings.filter(b => {
      const bookingDate = new Date(b.startTime).toISOString().split('T')[0];
      return bookingDate === dateStr;
    });

    // Generate all possible 4-hour slots for the day (9 AM to 9 PM)
    const slots = [];
    for (let hour = 9; hour < 21; hour++) {
      const slotStart = new Date(date);
      slotStart.setHours(hour, 0, 0, 0);
      const slotEnd = new Date(slotStart.getTime() + this.SLOT_DURATION_MS);

      // Check if this slot conflicts with any existing booking
      const isBooked = dayBookings.some(booking => {
        return slotStart < booking.endTime && slotEnd > booking.startTime;
      });

      slots.push({
        startTime: `${String(hour).padStart(2, '0')}:00`,
        endTime: `${String((hour + 4) % 24).padStart(2, '0')}:00`,
        isBooked,
        slotStart: slotStart.toISOString(),
        slotEnd: slotEnd.toISOString()
      });
    }

    return slots;
  }

  // Get confirmed bookings for a venue on a specific date
  async getConfirmedBookingsForDate(venueId, date) {
    const venue = await venueRepository.findById(venueId);
    if (!venue) {
      throw new NotFoundError('Venue not found');
    }

    // Get all confirmed bookings (payment_pending and payment_completed)
    const bookings = await bookingRepository.findConfirmedByVenueId(venueId);
    const dateStr = new Date(date).toISOString().split('T')[0];

    // Filter bookings for the specific date
    const dayBookings = bookings.filter(b => {
      const bookingDate = new Date(b.startTime).toISOString().split('T')[0];
      return bookingDate === dateStr;
    });

    // Return simplified booking data with time ranges
    return dayBookings.map(booking => ({
      startTime: booking.startTime,
      endTime: booking.endTime,
      startHour: new Date(booking.startTime).getHours(),
      endHour: new Date(booking.endTime).getHours()
    }));
  }

  // Add booking request to priority queue
  async addToQueue(userId, venueId, date, startTime) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const venue = await venueRepository.findById(venueId);
    if (!venue) {
      throw new NotFoundError('Venue not found');
    }

    // Fetch user details from university database
    const universityService = require('./UniversityService');
    const universityUser = await universityService.getUserByEmail(user.email);
    const userName = universityUser
      ? universityUser.name
      : user.email;

    const bookingRequest = {
      userId,
      venueId,
      date,
      startTime,
      userName,
      userEmail: user.email
    };

    const requestId = bookingQueueRepository.addToQueue(venueId, bookingRequest, 1);

    return {
      requestId,
      status: 'queued',
      message: `Your booking request has been queued.`
    };
  }

  // Get queue status for a venue
  getQueueStatus(venueId) {
    return bookingQueueRepository.getQueueStatus(venueId);
  }

  // Get user's position in queue
  getUserQueuePosition(venueId, userId) {
    return bookingQueueRepository.getUserQueuePosition(venueId, userId);
  }

  // Process next booking from queue
  async processNextBooking(venueId) {
    const nextRequest = bookingQueueRepository.getNextRequest(venueId);

    if (!nextRequest) {
      throw new NotFoundError('No pending booking requests in queue');
    }

    try {
      // Try to create the booking
      const booking = await this.createBooking(
        nextRequest.userId,
        nextRequest.venueId,
        nextRequest.date,
        nextRequest.startTime
      );

      // Mark request as processed
      bookingQueueRepository.processRequest(venueId, nextRequest.id);

      return {
        success: true,
        booking,
        message: `Booking confirmed for ${nextRequest.userName}`
      };
    } catch (error) {
      // If booking fails, remove from queue and return error
      bookingQueueRepository.processRequest(venueId, nextRequest.id);
      throw error;
    }
  }

  // Get all queue statuses
  getAllQueuesStatus() {
    return bookingQueueRepository.getAllQueuesStatus();
  }

  // Check if user has overlapping bookings
  async checkUserDoubleBooking(userId, startTime, endTime) {
    const userBookings = await bookingRepository.findByUserId(userId);
    const conflicts = userBookings.filter(booking => {
      if (booking.status === 'cancelled') return false;
      return startTime < booking.endTime && endTime > booking.startTime;
    });

    return {
      hasConflict: conflicts.length > 0,
      conflictingBookings: conflicts.map(b => ({
        id: b.id,
        venueId: b.venueId,
        startTime: b.startTime,
        endTime: b.endTime,
        date: b.date
      }))
    };
  }

  // Get user's active bookings
  async getUserActiveBookings(userId) {
    const bookings = await bookingRepository.findByUserId(userId);
    return bookings.filter(b => b.status !== 'cancelled');
  }

  // Approve a booking (admin only) - Moves to payment pending stage or completed if charges waived
  async approveBooking(bookingId, adminId, waiveCharges = false) {
    const booking = await this.getBookingById(bookingId);

    if (booking.status !== 'pending_approval') {
      throw new ValidationError(`Cannot approve a booking with status: ${booking.status}`);
    }

    const admin = await userRepository.findById(adminId);
    if (!admin || (admin.role !== 'admin' && admin.role !== 'super_admin')) {
      throw new ValidationError('Only admins can approve bookings');
    }

    // Verify admin owns this venue (unless super_admin)
    if (admin.role === 'admin') {
      const venueId = booking.venueId._id || booking.venueId;
      const venue = await venueRepository.findById(venueId);

      if (!venue) {
        throw new ValidationError('Venue not found');
      }

      // Handle both populated and non-populated ownerId
      const venueOwnerIdStr = venue.ownerId?._id?.toString() || venue.ownerId?.toString();
      const adminIdStr = adminId.toString();

      if (!venueOwnerIdStr || venueOwnerIdStr !== adminIdStr) {
        throw new ValidationError('You can only approve bookings for your own venues');
      }
    }

    let updateData;

    if (waiveCharges) {
      // If charges are waived, mark booking as completed directly
      updateData = {
        status: 'payment_completed',
        workflowStage: 'payment_completed',
        paymentStatus: 'waived',
        chargesWaived: true,
        chargesWaivedBy: adminId,
        chargesWaivedDate: new Date(),
        approvedBy: adminId,
        approvalDate: new Date()
      };
    } else {
      // Normal flow - require payment
      updateData = {
        status: 'payment_pending',
        workflowStage: 'approved_awaiting_payment',
        paymentStatus: 'pending',
        approvedBy: adminId,
        approvalDate: new Date()
      };
    }

    const approved = await bookingRepository.update(bookingId, updateData);

    if (!approved) {
      throw new NotFoundError('Booking not found');
    }

    // Auto-reject all other pending bookings that overlap with this approved booking
    await this.autoRejectOverlappingBookings(approved);

    // Send notification to user
    if (waiveCharges) {
      await notificationService.sendBookingConfirmation(approved);
    } else {
      await notificationService.sendPaymentRequiredNotification(approved);
    }

    return {
      booking: approved,
      message: waiveCharges
        ? 'Booking approved with charges waived. User has been notified that no payment is required. Overlapping pending requests have been automatically rejected.'
        : 'Booking approved. User has been notified to complete the payment. Overlapping pending requests have been automatically rejected.'
    };
  }

  // Auto-reject overlapping pending bookings when one is approved
  async autoRejectOverlappingBookings(approvedBooking) {
    const venueId = approvedBooking.venueId._id || approvedBooking.venueId;

    // Find all pending bookings for this venue that overlap with the approved booking
    const allBookings = await bookingRepository.findByVenueId(venueId);

    const overlappingPendingBookings = allBookings.filter(booking => {
      // Skip the approved booking itself
      if (booking._id.toString() === approvedBooking._id.toString()) return false;

      // Only consider pending_approval bookings
      if (booking.status !== 'pending_approval') return false;

      // Check for time overlap
      return approvedBooking.startTime < booking.endTime &&
        approvedBooking.endTime > booking.startTime;
    });

    // Reject all overlapping bookings
    const rejectionPromises = overlappingPendingBookings.map(booking =>
      bookingRepository.update(booking._id, {
        status: 'rejected',
        workflowStage: 'rejected',
        rejectionReason: `This time slot has been booked by another user. The booking from ${approvedBooking.startTime.toLocaleString()} to ${approvedBooking.endTime.toLocaleString()} was approved first.`
      })
    );

    const rejectedBookings = await Promise.all(rejectionPromises);

    // Send notifications to affected users
    for (const rejectedBooking of rejectedBookings) {
      if (rejectedBooking) {
        await this.sendRejectionNotification(rejectedBooking);
      }
    }

    return rejectedBookings.length;
  }

  async sendPaymentRequiredNotification(booking) {
    // Handled by direct call to notificationService in approveBooking
  }

  async sendChargesWaivedNotification(booking) {
    // Handled by direct call to notificationService in approveBooking
  }

  // Reject a booking (admin only)
  async rejectBooking(bookingId, adminId, rejectionReason = '') {
    const booking = await this.getBookingById(bookingId);

    if (booking.status !== 'pending_approval') {
      throw new ValidationError(`Cannot reject a booking with status: ${booking.status}`);
    }

    const admin = await userRepository.findById(adminId);
    if (!admin || (admin.role !== 'admin' && admin.role !== 'super_admin')) {
      throw new ValidationError('Only admins can reject bookings');
    }

    // Verify admin owns this venue (unless super_admin)
    if (admin.role === 'admin') {
      const venueId = booking.venueId._id || booking.venueId;
      const venue = await venueRepository.findById(venueId);

      if (!venue) {
        throw new ValidationError('Venue not found');
      }

      // Handle both populated and non-populated ownerId
      const venueOwnerIdStr = venue.ownerId?._id?.toString() || venue.ownerId?.toString();
      const adminIdStr = adminId.toString();

      if (!venueOwnerIdStr || venueOwnerIdStr !== adminIdStr) {
        throw new ValidationError('You can only reject bookings for your own venues');
      }
    }

    const rejected = await bookingRepository.update(bookingId, {
      status: 'rejected',
      workflowStage: 'rejected',
      rejectionReason: rejectionReason || 'No reason provided'
    });

    if (!rejected) {
      throw new NotFoundError('Booking not found');
    }

    // Send notification to user about rejection
    await notificationService.sendRejectionNotification(rejected);

    return {
      booking: rejected,
      message: 'Booking rejected. User has been notified.'
    };
  }

  async sendRejectionNotification(booking) {
    // Handled by direct call to notificationService in rejectBooking
  }

  // Submit payment for approved booking
  async submitPayment(bookingId, userId, paymentDetails, paymentProofFile = null) {
    const booking = await this.getBookingById(bookingId);

    // Verify booking belongs to user
    // booking.userId might be populated (object) or just an ID (string/ObjectId)
    const bookingUserId = booking.userId._id ? booking.userId._id.toString() : booking.userId.toString();
    if (bookingUserId !== userId.toString()) {
      throw new ValidationError('You can only submit payment for your own bookings');
    }

    // Verify booking is in payment pending status
    if (booking.status !== 'payment_pending') {
      throw new ValidationError(`Cannot submit payment for booking with status: ${booking.status}`);
    }

    const paymentData = {
      status: 'payment_completed',
      workflowStage: 'payment_completed',
      paymentStatus: 'completed',
      'paymentDetails.transactionId': paymentDetails.transactionId || `TXN-${Date.now()}`,
      'paymentDetails.paymentMethod': paymentDetails.paymentMethod || 'Not specified',
      'paymentDetails.paidAmount': booking.price,
      'paymentDetails.paymentDate': new Date()
    };

    // If payment proof is uploaded
    if (paymentProofFile) {
      paymentData['paymentDetails.paymentProof'] = {
        filename: paymentProofFile.originalname,
        path: paymentProofFile.path,
        mimetype: paymentProofFile.mimetype,
        size: paymentProofFile.size,
        uploadedAt: new Date()
      };
    }

    const updated = await bookingRepository.update(bookingId, paymentData);

    if (!updated) {
      throw new NotFoundError('Booking not found');
    }

    // Send confirmation notification
    await notificationService.sendBookingConfirmation(updated);

    return {
      booking: updated,
      message: 'Payment submitted successfully. Your booking is now confirmed!'
    };
  }

  async sendPaymentConfirmationNotification(booking) {
    // Handled by direct call to notificationService in submitPayment
  }

  // Get bookings by payment status (admin)
  async getBookingsByPaymentStatus(paymentStatus) {
    const allBookings = await bookingRepository.findAll();
    return allBookings.filter(b => b.paymentStatus === paymentStatus);
  }

  // Get pending approval bookings (filtered by admin's venues)
  async getPendingApprovalBookings(adminId) {
    const allBookings = await bookingRepository.findAll();
    const venueRepository = require('../repositories/VenueRepository');
    const universityService = require('./UniversityService');

    // Get admin's venues
    const adminVenues = await venueRepository.findByOwnerId(adminId);
    const adminVenueIds = adminVenues.map(v => v._id.toString());

    // Filter bookings for admin's venues only
    const filteredBookings = allBookings.filter(b =>
      b.status === 'pending_approval' &&
      adminVenueIds.includes(b.venueId._id.toString())
    );

    // Enrich bookings with university user data (name and type)
    const enrichedBookings = await Promise.all(
      filteredBookings.map(async (booking) => {
        try {
          const universityUser = await universityService.getUserByEmail(booking.userId.email);
          return {
            ...booking.toObject(),
            userId: {
              ...booking.userId.toObject(),
              name: universityUser?.name || '',
              type: universityUser?.type || 'student'
            }
          };
        } catch (error) {
          console.error(`Error fetching university user for ${booking.userId.email}:`, error.message);
          return {
            ...booking.toObject(),
            userId: {
              ...booking.userId.toObject(),
              name: '',
              type: 'student'
            }
          };
        }
      })
    );

    return enrichedBookings;
  }

  // Get payment pending bookings
  async getPaymentPendingBookings() {
    const allBookings = await bookingRepository.findAll();
    return allBookings.filter(b => b.status === 'payment_pending');
  }

  // Get pending bookings (admin only)
  async getPendingBookings() {
    return bookingRepository.findWithFilters({ status: 'pending' });
  }

  // Get bookings by status
  async getBookingsByStatus(status) {
    return bookingRepository.findWithFilters({ status });
  }
}

module.exports = new BookingService();
