const mongoose = require('mongoose');

const commissionSettingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null, index: true },
  commissionPercent: { type: Number, required: true, min: 0, max: 100, default: 0 },
  platformFee: { type: Number, min: 0, default: 0 }
}, { timestamps: true });

module.exports = mongoose.models.CommissionSetting || mongoose.model('CommissionSetting', commissionSettingSchema);
