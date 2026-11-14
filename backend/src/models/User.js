const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, unique: true, trim: true },
  email: { type: String, trim: true, lowercase: true, default: null, sparse: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['customer', 'technician', 'admin'], default: 'customer' },
  city: { type: String, required: true, trim: true },
  locality: { type: String, default: '', trim: true },
  address: { type: String, default: '', trim: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

userSchema.index({ city: 1, locality: 1 });
module.exports = mongoose.models.User || mongoose.model('User', userSchema);
