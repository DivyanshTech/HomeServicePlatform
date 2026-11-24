const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, trim: true, uppercase: true, maxlength: 40 },
  discountType: { type: String, enum: ['flat', 'percentage'], required: true },
  discountValue: { type: Number, required: true, min: 0 },
  minOrder: { type: Number, default: 0, min: 0 },
  isActive: { type: Boolean, default: true, index: true },
  startsAt: { type: Date, default: null },
  expiresAt: { type: Date, default: null }
}, { timestamps: true });

couponSchema.path('discountValue').validate(function (value) {
  return this.discountType !== 'percentage' || value <= 100;
}, 'Percentage discount cannot exceed 100');
couponSchema.pre('validate', function () {
  if (this.startsAt && this.expiresAt && this.startsAt > this.expiresAt) {
    this.invalidate('expiresAt', 'Coupon expiry must be after its start date');
  }
});

module.exports = mongoose.models.Coupon || mongoose.model('Coupon', couponSchema);
