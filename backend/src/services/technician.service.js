const Technician = require('../models/Technician');
const User = require('../models/User');
const Category = require('../models/Category');
const Booking = require('../models/Booking');
const { normalize } = require('../utils/normalize');

const populateTech = q => q.populate('userId', 'name phone email city locality address').populate('category', 'name description icon');

async function getProfileByUserId(userId) {
  return populateTech(Technician.findOne({ userId }));
}
async function registerTechnician(userId, data) {
  const existing = await Technician.findOne({ userId });
  if (existing) throw new Error('Technician application already exists');
  const category = await Category.findOne({ _id: data.category, isActive: true });
  if (!category) throw new Error('Invalid service category');
  const tech = await Technician.create({ userId, category: category._id, experience: data.experience, serviceCharge: data.serviceCharge, profileImage: data.profileImage || '' });
  await User.findByIdAndUpdate(userId, { role: 'technician' });
  return populateTech(Technician.findById(tech._id));
}
async function listApprovedForCustomer(userId, query) {
  const customer = await User.findById(userId).select('city locality');
  if (!customer) throw new Error('Customer not found');
  const filter = { isApproved: true, availability: true };
  if (query.category) filter.category = query.category;
  const city = normalize(customer.city);
  const locality = normalize(customer.locality);
  const userIds = await User.find(locality ? { city: { $regex: `^${escapeRegex(city)}$`, $options: 'i' }, locality: { $regex: `^${escapeRegex(locality)}$`, $options: 'i' } } : { city: { $regex: `^${escapeRegex(city)}$`, $options: 'i' } }).distinct('_id');
  filter.userId = { $in: userIds };
  const page = Math.max(Number(query.page) || 1, 1), limit = Math.min(Math.max(Number(query.limit) || 12, 1), 50);
  const [list, total] = await Promise.all([populateTech(Technician.find(filter).sort({ rating: -1, totalJobs: -1 }).skip((page-1)*limit).limit(limit)), Technician.countDocuments(filter)]);
  return { list, pagination: { total, page, limit, pages: Math.ceil(total/limit) } };
}
function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
async function getById(id) { const tech = await populateTech(Technician.findById(id)); if (!tech || !tech.isApproved) throw new Error('Technician not found'); return tech; }
async function updateProfile(userId, data) {
  const patch = {};
  ['experience','serviceCharge','availability','profileImage'].forEach(k => { if (data[k] !== undefined) patch[k] = data[k]; });
  if (data.category) patch.category = data.category;
  const tech = await Technician.findOneAndUpdate({ userId }, patch, { new: true, runValidators: true });
  if (!tech) throw new Error('Technician profile not found');
  if (data.name || data.phone || data.email || data.city || data.locality || data.address) await User.findByIdAndUpdate(userId, Object.fromEntries(['name','phone','email','city','locality','address'].filter(k => data[k] !== undefined).map(k => [k,data[k]])));
  return populateTech(Technician.findById(tech._id));
}
async function recalcRating(technicianId) {
  const rows = await Booking.find({ technicianId, status: 'completed', 'review.rating': { $ne: null } }).select('review.rating');
  const total = rows.reduce((sum, r) => sum + r.review.rating, 0);
  await Technician.findByIdAndUpdate(technicianId, { rating: rows.length ? Math.round((total / rows.length) * 10) / 10 : 0, reviewCount: rows.length });
}
module.exports = { getProfileByUserId, registerTechnician, listApprovedForCustomer, getById, updateProfile, recalcRating };
