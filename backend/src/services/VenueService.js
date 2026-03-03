const venueRepository = require('../repositories/VenueRepository');
const { ValidationError, NotFoundError } = require('../utils/errors');
const { validateTimeFormat } = require('../utils/validation');

class VenueService {
  async createVenue(input, ownerId) {
    if (!input.name || input.name.trim().length === 0) {
      throw new ValidationError('Venue name is required');
    }
    if (!input.description || input.description.trim().length === 0) {
      throw new ValidationError('Venue description is required');
    }
    if (!input.capacity || input.capacity <= 0) {
      throw new ValidationError('Venue capacity must be greater than 0');
    }
    if (!input.location || input.location.trim().length === 0) {
      throw new ValidationError('Venue location is required');
    }
    if (!Array.isArray(input.amenities)) {
      throw new ValidationError('Amenities must be an array');
    }
    if (input.price === undefined || input.price === null) {
      throw new ValidationError('Venue price is required');
    }
    if (typeof input.price !== 'number' || input.price < 0) {
      throw new ValidationError('Venue price must be a non-negative number');
    }

    return venueRepository.create({ ...input, ownerId });
  }

  async getVenueById(id) {
    const venue = await venueRepository.findById(id);
    if (!venue) {
      throw new NotFoundError('Venue not found');
    }
    return venue;
  }

  async getAllVenues() {
    return venueRepository.findAll();
  }

  async getVenuesByOwner(ownerId) {
    return venueRepository.findByOwnerId(ownerId);
  }

  async checkOwnership(venueId, userId) {
    const venue = await venueRepository.findById(venueId);
    if (!venue) {
      throw new NotFoundError('Venue not found');
    }

    // Only the owner can manage their venue
    return venue.ownerId.toString() === userId;
  }

  async searchVenues(filters) {
    let results = [];
    if (filters.name) {
      results = await venueRepository.searchByName(filters.name);
    } else {
      results = await venueRepository.findAll();
    }

    if (filters.date && filters.startTime && filters.endTime) {
      results = await Promise.all(
        results.map(async (venue) => {
          const isAvailable = await venueRepository.isAvailableAtTime(
            venue.id,
            filters.date,
            filters.startTime,
            filters.endTime
          );
          return isAvailable ? venue : null;
        })
      ).then(venues => venues.filter(v => v !== null));
    }

    return results;
  }

  async updateVenue(id, updates, userId) {
    await this.getVenueById(id);
    
    // Check ownership
    const hasAccess = await this.checkOwnership(id, userId);
    if (!hasAccess) {
      throw new ValidationError('You can only update your own venues');
    }

    if (updates.name !== undefined && (!updates.name || updates.name.trim().length === 0)) {
      throw new ValidationError('Venue name cannot be empty');
    }
    if (updates.capacity !== undefined && updates.capacity <= 0) {
      throw new ValidationError('Venue capacity must be greater than 0');
    }
    if (updates.location !== undefined && (!updates.location || updates.location.trim().length === 0)) {
      throw new ValidationError('Venue location cannot be empty');
    }
    if (updates.price !== undefined) {
      if (typeof updates.price !== 'number' || updates.price < 0) {
        throw new ValidationError('Venue price must be a non-negative number');
      }
    }
    if (updates.currency !== undefined) {
      const validCurrencies = ['USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD'];
      if (!validCurrencies.includes(updates.currency)) {
        throw new ValidationError(`Currency must be one of: ${validCurrencies.join(', ')}`);
      }
    }

    const updated = await venueRepository.update(id, updates);
    if (!updated) {
      throw new NotFoundError('Venue not found');
    }
    return updated;
  }

  async deleteVenue(id, userId) {
    await this.getVenueById(id);
    
    // Check ownership
    const hasAccess = await this.checkOwnership(id, userId);
    if (!hasAccess) {
      throw new ValidationError('You can only delete your own venues');
    }

    const deleted = await venueRepository.softDelete(id);
    if (!deleted) {
      throw new NotFoundError('Venue not found');
    }
  }

  async setAvailability(id, availability) {
    await this.getVenueById(id);
    if (!Array.isArray(availability)) {
      throw new ValidationError('Availability must be an array');
    }

    for (const slot of availability) {
      if (slot.dayOfWeek < 0 || slot.dayOfWeek > 6) {
        throw new ValidationError('Day of week must be between 0 and 6');
      }
      if (!validateTimeFormat(slot.startTime) || !validateTimeFormat(slot.endTime)) {
        throw new ValidationError('Time must be in HH:MM format');
      }
      if (slot.startTime >= slot.endTime) {
        throw new ValidationError('Start time must be before end time');
      }
    }

    const updated = await venueRepository.setAvailability(id, availability);
    if (!updated) {
      throw new NotFoundError('Venue not found');
    }
    return updated;
  }

  // Transfer venue ownership (super admin only)
  async transferVenueOwnership(venueId, newOwnerId) {
    const venue = await this.getVenueById(venueId);
    
    // Verify new owner exists and is an admin
    const userRepository = require('../repositories/UserRepository');
    const newOwner = await userRepository.findById(newOwnerId);
    if (!newOwner) {
      throw new NotFoundError('New owner not found');
    }
    if (newOwner.role !== 'admin' && newOwner.role !== 'super_admin') {
      throw new ValidationError('New owner must be an admin or super admin');
    }

    const updated = await venueRepository.update(venueId, { ownerId: newOwnerId });
    if (!updated) {
      throw new NotFoundError('Venue not found');
    }
    return updated;
  }

  // Transfer all venues from one admin to another (super admin only)
  async transferAllVenues(fromAdminId, toAdminId) {
    // Verify both admins exist
    const userRepository = require('../repositories/UserRepository');
    const fromAdmin = await userRepository.findById(fromAdminId);
    const toAdmin = await userRepository.findById(toAdminId);
    
    if (!fromAdmin) {
      throw new NotFoundError('Source admin not found');
    }
    if (!toAdmin) {
      throw new NotFoundError('Target admin not found');
    }
    if (toAdmin.role !== 'admin' && toAdmin.role !== 'super_admin') {
      throw new ValidationError('Target user must be an admin or super admin');
    }

    const venues = await venueRepository.findByOwnerId(fromAdminId);
    
    // Transfer all venues
    const transferPromises = venues.map(venue => 
      venueRepository.update(venue._id, { ownerId: toAdminId })
    );
    
    await Promise.all(transferPromises);
    
    return {
      transferredCount: venues.length,
      venues: venues.map(v => ({ id: v._id, name: v.name }))
    };
  }
}

module.exports = new VenueService();
