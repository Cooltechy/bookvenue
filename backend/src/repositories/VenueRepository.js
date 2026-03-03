const Venue = require('../models/Venue');

class VenueRepository {
  async create(input) {
    const venue = new Venue({
      name: input.name,
      description: input.description,
      capacity: input.capacity,
      location: input.location,
      authority: input.authority,
      ownerId: input.ownerId,
      price: input.price,
      halfDayPrice: input.halfDayPrice,
      fullDayPrice: input.fullDayPrice,
      currency: input.currency || 'INR',
      availableFromTime: input.availableFromTime || '08:00',
      availableToTime: input.availableToTime || '22:00',
      amenities: input.amenities || [],
      availability: input.availability || [],
      isDeleted: false
    });
    await venue.save();
    return venue;
  }

  async findById(id) {
    try {
      return await Venue.findOne({ _id: id, isDeleted: false })
        .populate('ownerId', 'firstName lastName email');
    } catch (error) {
      return null;
    }
  }

  async findAll() {
    return await Venue.find({ isDeleted: false })
      .populate('ownerId', 'firstName lastName email');
  }

  async findByOwnerId(ownerId) {
    return await Venue.find({ ownerId, isDeleted: false })
      .populate('ownerId', 'firstName lastName email');
  }

  async searchByName(name) {
    return await Venue.find({
      isDeleted: false,
      name: { $regex: name, $options: 'i' }
    }).populate('ownerId', 'firstName lastName email');
  }

  async update(id, updates) {
    try {
      return await Venue.findByIdAndUpdate(
        id,
        { ...updates, updatedAt: new Date() },
        { new: true }
      );
    } catch (error) {
      return null;
    }
  }

  async softDelete(id) {
    try {
      const result = await Venue.findByIdAndUpdate(
        id,
        { isDeleted: true, updatedAt: new Date() },
        { new: true }
      );
      return !!result;
    } catch (error) {
      return false;
    }
  }

  async setAvailability(id, availability) {
    try {
      return await Venue.findByIdAndUpdate(
        id,
        { availability, updatedAt: new Date() },
        { new: true }
      );
    } catch (error) {
      return null;
    }
  }

  async isAvailableAtTime(venueId, date, startTime, endTime) {
    try {
      const venue = await this.findById(venueId);
      if (!venue) return false;
      const dayOfWeek = new Date(date).getDay();
      return venue.availability.some(slot => slot.dayOfWeek === dayOfWeek);
    } catch (error) {
      return false;
    }
  }
}

module.exports = new VenueRepository();
