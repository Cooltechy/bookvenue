const Booking = require('../models/Booking');

class BookingRepository {
  async create(input) {
    const booking = new Booking({
      userId: input.userId,
      venueId: input.venueId,
      startTime: input.startTime,
      endTime: input.endTime,
      purpose: input.purpose || 'Not specified',
      permissionDocument: input.permissionDocument,
      price: input.price,
      durationHours: input.durationHours,
      pricingType: input.pricingType,
      currency: input.currency || 'INR',
      status: input.status || 'pending_approval',
      workflowStage: input.workflowStage || 'submitted',
      paymentStatus: input.paymentStatus || 'not_required'
    });
    await booking.save();
    return booking;
  }

  async findById(id) {
    try {
      return await Booking.findById(id)
        .populate('userId', 'firstName lastName email')
        .populate('venueId', 'name location');
    } catch (error) {
      return null;
    }
  }

  async findAll() {
    return await Booking.find({})
      .populate('userId', 'firstName lastName email')
      .populate('venueId', 'name location')
      .sort({ createdAt: -1 });
  }

  async findByUserId(userId) {
    return await Booking.find({ userId })
      .populate('venueId', 'name location')
      .sort({ startTime: -1 });
  }

  async findByVenueId(venueId) {
    return await Booking.find({ venueId })
      .populate('userId', 'firstName lastName email')
      .sort({ startTime: 1 });
  }

  async findConfirmedByVenueId(venueId) {
    return await Booking.find({
      venueId,
      status: { $in: ['pending_approval', 'payment_pending', 'payment_completed'] }
    }).sort({ startTime: 1 });
  }

  async findWithFilters(filters) {
    const query = {};
    if (filters.userId) query.userId = filters.userId;
    if (filters.venueId) query.venueId = filters.venueId;
    if (filters.status) query.status = filters.status;
    if (filters.startDate || filters.endDate) {
      query.startTime = {};
      if (filters.startDate) query.startTime.$gte = filters.startDate;
      if (filters.endDate) query.startTime.$lte = filters.endDate;
    }
    return await Booking.find(query)
      .populate('userId', 'firstName lastName email')
      .populate('venueId', 'name location')
      .sort({ createdAt: -1 });
  }

  async checkConflict(venueId, startTime, endTime, excludeBookingId) {
    const query = {
      venueId,
      status: { $in: ['pending_approval', 'payment_pending', 'payment_completed'] },
      $or: [
        {
          startTime: { $lt: endTime },
          endTime: { $gt: startTime }
        }
      ]
    };
    if (excludeBookingId) {
      query._id = { $ne: excludeBookingId };
    }
    const conflictingBooking = await Booking.findOne(query);
    return !!conflictingBooking;
  }

  async cancel(id) {
    try {
      return await Booking.findByIdAndUpdate(
        id,
        { status: 'cancelled', updatedAt: new Date() },
        { new: true }
      ).populate('userId', 'firstName lastName email')
       .populate('venueId', 'name location');
    } catch (error) {
      return null;
    }
  }

  async delete(id) {
    try {
      const result = await Booking.findByIdAndDelete(id);
      return !!result;
    } catch (error) {
      return false;
    }
  }

  async update(id, updates) {
    try {
      return await Booking.findByIdAndUpdate(
        id,
        { ...updates, updatedAt: new Date() },
        { new: true }
      ).populate('userId', 'firstName lastName email')
       .populate('venueId', 'name location');
    } catch (error) {
      return null;
    }
  }
}

module.exports = new BookingRepository();
