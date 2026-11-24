const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, unique: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  technicianId: { type: mongoose.Schema.Types.ObjectId, ref: 'Technician', required: true, index: true },
  description: { type: String, required: true, trim: true, minlength: 10, maxlength: 2000 },
  status: {
    type: String,
    enum: ['pending', 'in_review', 'resolved', 'dismissed'],
    default: 'pending',
    index: true
  },
  adminNote: { type: String, default: '', trim: true, maxlength: 1000 }
}, { timestamps: true });

complaintSchema.index({ status: 1, createdAt: -1 });
module.exports = mongoose.models.Complaint || mongoose.model('Complaint', complaintSchema);
