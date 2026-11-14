const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Technician = require('../models/Technician');
const Category = require('../models/Category');
const { normalize } = require('../utils/normalize');

const publicUser = user => ({ id: user._id, name: user.name, phone: user.phone, email: user.email, role: user.role, city: user.city, locality: user.locality, address: user.address, isActive: user.isActive });

async function registerUser(data) {
  if (data.role === 'admin') throw new Error('Admin accounts cannot be created from public registration');
  if (data.role === 'technician' && (!data.category || data.experience === undefined || data.serviceCharge === undefined)) {
    throw new Error('Technician registration requires category, experience and service charge');
  }
  if (await User.findOne({ phone: data.phone })) throw new Error('Phone number already registered');
  const user = await User.create({
    name: data.name, phone: data.phone, email: data.email || null,
    password: await bcrypt.hash(data.password, 12), role: data.role || 'customer',
    city: data.city, locality: data.locality || '', address: data.address || ''
  });
  if (user.role === 'technician') {
    const category = await Category.findOne({ _id: data.category, isActive: true });
    if (!category) { await User.findByIdAndDelete(user._id); throw new Error('Invalid service category'); }
    await Technician.create({ userId: user._id, category: category._id, experience: data.experience, serviceCharge: data.serviceCharge, isApproved: false });
  }
  return publicUser(user);
}

async function loginUser({ phone, password }) {
  const user = await User.findOne({ phone }).select('+password');
  if (!user || !await bcrypt.compare(password, user.password)) throw new Error('Invalid phone number or password');
  if (!user.isActive) throw new Error('Account is inactive');
  const token = jwt.sign({ id: user._id.toString(), role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
  return { user: publicUser(user), token };
}
module.exports = { registerUser, loginUser, publicUser };
