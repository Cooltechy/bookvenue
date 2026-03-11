const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  venueId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Venue',
    required: true
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['pending_approval', 'approved', 'payment_pending', 'payment_completed', 'rejected', 'cancelled'],
    default: 'pending_approval',
    description: 'Booking workflow status'
  },
  workflowStage: {
    type: String,
    enum: ['submitted', 'under_review', 'approved_awaiting_payment', 'payment_completed', 'rejected', 'cancelled'],
    default: 'submitted',
    description: 'Current stage in the booking workflow'
  },
  purpose: {
    type: String,
    required: true,
    trim: true,
    description: 'Purpose of the booking'
  },
  permissionDocument: {
    filename: {
      type: String,
      required: true,
      description: 'Original filename of the uploaded permission document'
    },
    path: {
      type: String,
      required: true,
      description: 'Storage path of the permission document'
    },
    mimetype: {
      type: String,
      required: true,
      description: 'MIME type of the uploaded file'
    },
    size: {
      type: Number,
      required: true,
      description: 'File size in bytes'
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
      description: 'When the document was uploaded'
    }
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  approvalDate: {
    type: Date,
    default: null
  },
  rejectionReason: {
    type: String,
    default: null
  },
  paymentStatus: {
    type: String,
    enum: ['not_required', 'pending', 'completed', 'failed', 'refunded', 'waived'],
    default: 'not_required',
    description: 'Payment status for the booking'
  },
  chargesWaived: {
    type: Boolean,
    default: false,
    description: 'Whether the admin has waived the charges for this booking'
  },
  chargesWaivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    description: 'Admin who waived the charges'
  },
  chargesWaivedDate: {
    type: Date,
    default: null,
    description: 'When the charges were waived'
  },
  paymentDetails: {
    transactionId: {
      type: String,
      default: null,
      description: 'Payment transaction ID'
    },
    paymentMethod: {
      type: String,
      default: null,
      description: 'Payment method used'
    },
    paidAmount: {
      type: Number,
      default: null,
      description: 'Amount paid'
    },
    paymentDate: {
      type: Date,
      default: null,
      description: 'When payment was completed'
    },
    paymentProof: {
      filename: String,
      path: String,
      mimetype: String,
      size: Number,
      uploadedAt: Date
    }
  },
  price: {
    type: Number,
    required: true,
    min: 0,
    description: 'Price charged for this booking (captured at booking time)'
  },
  durationHours: {
    type: Number,
    required: true,
    min: 1,
    description: 'Duration of booking in hours'
  },
  pricingType: {
    type: String,
    enum: ['hourly', 'half-day', 'full-day'],
    required: true,
    description: 'Type of pricing applied'
  },
  currency: {
    type: String,
    default: 'INR',
    enum: ['USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD'],
    description: 'Currency for the price'
  }
}, {
  timestamps: true
});

// Indexes for faster queries
bookingSchema.index({ userId: 1 });
bookingSchema.index({ venueId: 1 });
bookingSchema.index({ startTime: 1, endTime: 1 });
// Compound index for conflict checking
bookingSchema.index({ venueId: 1, startTime: 1, endTime: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
