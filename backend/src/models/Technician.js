const mongoose = require('mongoose');

const technicianSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
  profileImage: { type: String, default: '' },
  experience: { type: Number, min: 0, default: 0 },
  serviceCharge: { type: Number, min: 0, required: true, default: 0 },
  availability: { type: Boolean, default: true },
  rating: { type: Number, min: 0, max: 5, default: 0 },
  reviewCount: { type: Number, default: 0 },
  totalJobs: { type: Number, default: 0 },
  isApproved: { type: Boolean, default: false },
  approvedAt: { type: Date, default: null },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] }
  }
}, { timestamps: true });

technicianSchema.index({ isApproved: 1, availability: 1, category: 1 });
technicianSchema.index({ location: '2dsphere' });
module.exports = mongoose.models.Technician || mongoose.model('Technician', technicianSchema);
