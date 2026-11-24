const mongoose = require('mongoose');

const sparePartSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, default: '', trim: true, maxlength: 500 },
  price: { type: Number, required: true, min: 0 },
  unit: { type: String, default: 'item', trim: true, maxlength: 30 },
  isActive: { type: Boolean, default: true }
});

const serviceItemSchema = new mongoose.Schema({
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
  type: { type: String, enum: ['service', 'package'], default: 'service', index: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, default: '', trim: true, maxlength: 1000 },
  price: { type: Number, required: true, min: 0 },
  durationMinutes: { type: Number, required: true, min: 1, max: 1440 },
  inclusions: { type: [String], default: [] },
  exclusions: { type: [String], default: [] },
  frequentlyAddedTogether: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ServiceItem' }],
  spareParts: { type: [sparePartSchema], default: [] },
  isActive: { type: Boolean, default: true, index: true }
}, { timestamps: true });

serviceItemSchema.index({ category: 1, isActive: 1, type: 1 });
module.exports = mongoose.models.ServiceItem || mongoose.model('ServiceItem', serviceItemSchema);
