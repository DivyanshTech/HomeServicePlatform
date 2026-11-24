const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  description: { type: String, default: '', trim: true },
  icon: { type: String, default: '' },
  parentCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null, index: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });
module.exports = mongoose.models.Category || mongoose.model('Category', schema);
