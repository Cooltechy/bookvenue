const mongoose = require('mongoose');

const availabilitySchema = new mongoose.Schema({
  dayOfWeek: {
    type: Number,
    required: true,
    min: 0,
    max: 6 // 0 = Sunday, 6 = Saturday
  },
  startTime: {
    type: String,
    required: true
  },
  endTime: {
    type: String,
    required: true
  }
}, { _id: false });

const venueSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  capacity: {
    type: Number,
    required: true,
    min: 1
  },
  location: {
    type: String,
    required: true
  },
  amenities: [{
    type: String,
    trim: true
  }],
  availability: [availabilitySchema],
  authority: {
    type: String,
    required: true,
    trim: true,
    description: 'Authority or organization managing this venue'
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,  // Not required in validation, added by backend
    description: 'Admin/owner who manages this venue'
  },
  price: {
    type: Number,
    required: true,
    min: 0,
    description: 'Base price per hour in currency units'
  },
  halfDayPrice: {
    type: Number,
    required: true,
    min: 0,
    description: 'Price for half day (up to 5 hours) in currency units'
  },
  fullDayPrice: {
    type: Number,
    required: true,
    min: 0,
    description: 'Price for full day (more than 5 hours) in currency units'
  },
  currency: {
    type: String,
    default: 'INR',
    enum: ['USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD'],
    description: 'Currency for the price'
  },
  availableFromTime: {
    type: String,
    default: '08:00',
    description: 'Start time for venue availability (HH:MM format)'
  },
  availableToTime: {
    type: String,
    default: '22:00',
    description: 'End time for venue availability (HH:MM format)'
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for faster searches
venueSchema.index({ name: 1 });
venueSchema.index({ location: 1 });
venueSchema.index({ capacity: 1 });
venueSchema.index({ isDeleted: 1 });

module.exports = mongoose.model('Venue', venueSchema);
