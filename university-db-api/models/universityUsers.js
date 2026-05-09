const mongoose = require('mongoose');

const universityUserSchema = new mongoose.Schema({
  universityId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['student', 'faculty', 'staff'],
    default: 'student'
  },
  department: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes are automatically created by unique: true above
// No need to explicitly define them again

module.exports = mongoose.model('UniversityUser', universityUserSchema);
