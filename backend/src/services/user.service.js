const User = require('../models/User');
const { publicUser } = require('./auth.service');
const { normalize } = require('../utils/normalize');
async function getMe(id) { const u = await User.findById(id); if (!u) throw new Error('User not found'); return publicUser(u); }
async function updateMe(id, data) {
  const allowed = ['name','phone','email','city','locality','address'];
  const patch = {};
  for (const key of allowed) if (data[key] !== undefined) patch[key] = data[key];
  if (patch.phone) {
    const existing = await User.findOne({ phone: patch.phone, _id: { $ne: id } });
    if (existing) throw new Error('Phone number already registered');
  }
  const u = await User.findByIdAndUpdate(id, patch, { new: true, runValidators: true });
  if (!u) throw new Error('User not found');
  return publicUser(u);
}
module.exports = { getMe, updateMe };
