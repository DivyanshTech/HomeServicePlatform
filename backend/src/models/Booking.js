const mongoose = require('mongoose');

const addOnSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  price: { type: Number, required: true, min: 0 },
  serviceItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceItem', default: null },
  sparePartId: { type: mongoose.Schema.Types.ObjectId, default: null },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  decidedAt: { type: Date, default: null }
});

const assignmentSchema = new mongoose.Schema({
  fromTechnician: { type: mongoose.Schema.Types.ObjectId, ref: 'Technician', default: null },
  toTechnician: { type: mongoose.Schema.Types.ObjectId, ref: 'Technician', required: true },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignedAt: { type: Date, default: Date.now }
}, { _id: false });

const bookingSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  technicianId: { type: mongoose.Schema.Types.ObjectId, ref: 'Technician', default: null, index: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  serviceItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceItem', default: null },
  serviceName: { type: String, default: '', trim: true, maxlength: 120 },
  issueDescription: { type: String, required: true, trim: true, maxlength: 1000 },
  issueImage: { type: String, default: '' },
  serviceCharge: { type: Number, required: true, min: 0 },
  scheduledFor: { type: Date, default: null },
  scheduledDate: { type: Date, default: null },
  timeSlot: { type: String, default: '', trim: true, maxlength: 80 },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'on_the_way', 'in_progress', 'completed', 'cancelled'],
    default: 'pending', index: true
  },
  chatEnabledAt: { type: Date, default: null },
  startPin: { type: String, select: false },
  addOns: { type: [addOnSchema], default: [] },
  beforePhotos: { type: [String], default: [] },
  afterPhotos: { type: [String], default: [] },
  warrantyExpiresAt: { type: Date, default: null },
  warrantyClaim: {
    requested: { type: Boolean, default: false },
    reason: { type: String, default: '', trim: true, maxlength: 1000 },
    requestedAt: { type: Date, default: null }
  },
  paymentMethod: { type: String, enum: ['online_mock', 'cod'], default: 'cod' },
  paymentStatus: { type: String, enum: ['pending', 'succeeded', 'failed'], default: 'pending' },
  couponCode: { type: String, default: '', trim: true, uppercase: true, maxlength: 40 },
  discountAmount: { type: Number, default: 0, min: 0 },
  platformFee: { type: Number, default: 0, min: 0 },
  commissionPercent: { type: Number, default: null, min: 0, max: 100 },
  totalAmount: { type: Number, required: true, min: 0, default: 0 },
  assignmentHistory: { type: [assignmentSchema], default: [] },
  review: {
    rating: { type: Number, min: 1, max: 5, default: null },
    comment: { type: String, default: '', maxlength: 1000 },
    createdAt: { type: Date, default: null }
  }
}, { timestamps: true, optimisticConcurrency: true });

bookingSchema.index({ customerId: 1, createdAt: -1 });
bookingSchema.index({ technicianId: 1, createdAt: -1 });
bookingSchema.index({ scheduledDate: 1, timeSlot: 1, technicianId: 1, status: 1 });
module.exports = mongoose.models.Booking || mongoose.model('Booking', bookingSchema);
