const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  technicianId: { type: mongoose.Schema.Types.ObjectId, ref: 'Technician', required: true, index: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  issueDescription: { type: String, required: true, trim: true, maxlength: 1000 },
  issueImage: { type: String, default: '' },
  serviceCharge: { type: Number, required: true, min: 0 },
  scheduledFor: { type: Date, default: null },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'in_progress', 'completed', 'cancelled'],
    default: 'pending', index: true
  },
  review: {
    rating: { type: Number, min: 1, max: 5, default: null },
    comment: { type: String, default: '', maxlength: 1000 },
    createdAt: { type: Date, default: null }
  }
}, { timestamps: true });

bookingSchema.index({ customerId: 1, createdAt: -1 });
bookingSchema.index({ technicianId: 1, createdAt: -1 });
module.exports = mongoose.models.Booking || mongoose.model('Booking', bookingSchema);
