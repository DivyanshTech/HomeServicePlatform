const Technician = require('../models/Technician');
const User = require('../models/User');
const Category = require('../models/Category');
const Booking = require('../models/Booking');
const CommissionSetting = require('../models/CommissionSetting');
const pricingService = require('./pricing.service');
const { normalize } = require('../utils/normalize');

const populateTech = q => q.populate('userId', 'name phone email city locality address').populate('category', 'name description icon');
const populatePublicTech = q => q.populate('userId', 'name email city locality address').populate('category', 'name description icon');

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
  const filter = { isApproved: true, availability: true, isOnline: { $ne: false } };
  if (query.category) filter.category = query.category;
  const city = normalize(customer.city);
  const locality = normalize(customer.locality);
  const userIds = await User.find(locality ? { isActive: true, city: { $regex: `^${escapeRegex(city)}$`, $options: 'i' }, locality: { $regex: `^${escapeRegex(locality)}$`, $options: 'i' } } : { isActive: true, city: { $regex: `^${escapeRegex(city)}$`, $options: 'i' } }).distinct('_id');
  filter.userId = { $in: userIds };
  const page = Math.max(Number(query.page) || 1, 1), limit = Math.min(Math.max(Number(query.limit) || 12, 1), 50);
  const [list, total] = await Promise.all([populatePublicTech(Technician.find(filter).sort({ rating: -1, totalJobs: -1 }).skip((page-1)*limit).limit(limit)), Technician.countDocuments(filter)]);
  return { list, pagination: { total, page, limit, pages: Math.ceil(total/limit) } };
}
function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
async function getById(id) { const tech = await populatePublicTech(Technician.findById(id)); if (!tech || !tech.isApproved) throw new Error('Technician not found'); return tech; }
async function updateProfile(userId, data) {
  const patch = {};
  if (data.profileImage !== undefined) {
    if (typeof data.profileImage !== 'string'
      || (data.profileImage !== ''
        && !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(data.profileImage))
      || data.profileImage.length > 3000000) {
      throw httpError('Profile photo must be a JPEG, PNG or WebP image smaller than 2 MB', 400);
    }
    patch.profileImage = data.profileImage;
  }
  ['experience','serviceCharge','profileImage','servicePincodes','weeklyAvailability'].forEach(k => {
    if (data[k] !== undefined) patch[k] = data[k];
  });
  if (data.isOnline !== undefined || data.availability !== undefined) {
    const online = data.isOnline !== undefined ? data.isOnline : data.availability;
    if (typeof online !== 'boolean') throw httpError('Availability must be true or false', 400);
    patch.isOnline = online;
    patch.availability = online;
  }
  if (patch.servicePincodes !== undefined) {
    if (!Array.isArray(patch.servicePincodes)
      || patch.servicePincodes.some(code => typeof code !== 'string' || !/^\d{5,10}$/.test(code.trim()))) {
      throw httpError('Service pincodes must contain 5 to 10 digit values', 400);
    }
    patch.servicePincodes = [...new Set(patch.servicePincodes.map(code => code.trim()))];
  }
  if (patch.weeklyAvailability !== undefined) validateWeeklyAvailability(patch.weeklyAvailability);
  if (data.category) patch.category = data.category;
  const tech = await Technician.findOneAndUpdate({ userId }, patch, { new: true, runValidators: true });
  if (!tech) throw new Error('Technician profile not found');
  if (data.name || data.phone || data.email || data.city || data.locality || data.address) await User.findByIdAndUpdate(userId, Object.fromEntries(['name','phone','email','city','locality','address'].filter(k => data[k] !== undefined).map(k => [k,data[k]])));
  return populateTech(Technician.findById(tech._id));
}

function httpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function validateWeeklyAvailability(schedule) {
  if (!Array.isArray(schedule) || schedule.some(day => !day
    || !Number.isInteger(day.dayOfWeek) || day.dayOfWeek < 0 || day.dayOfWeek > 6
    || typeof day.isWorking !== 'boolean'
    || !/^([01]\d|2[0-3]):[0-5]\d$/.test(day.startTime)
    || !/^([01]\d|2[0-3]):[0-5]\d$/.test(day.endTime)
    || day.startTime >= day.endTime
  )) throw httpError('Weekly availability contains an invalid day or time range', 400);
  if (new Set(schedule.map(day => day.dayOfWeek)).size !== schedule.length) {
    throw httpError('Weekly availability can contain each day only once', 400);
  }
}

async function earningsSummary(userId) {
  const technician = await Technician.findOne({ userId }).select('_id');
  if (!technician) throw httpError('Technician profile not found', 404);
  const bookings = await Booking.find({ technicianId: technician._id, status: 'completed' })
    .select('category serviceCharge discountAmount addOns paymentMethod totalAmount commissionPercent');
  const categoryIds = [...new Set(bookings.map(booking => String(booking.category)))];
  const settings = await CommissionSetting.find({
    key: { $in: ['global', ...categoryIds.map(id => `category:${id}`)] }
  });
  const settingByKey = new Map(settings.map(setting => [setting.key, setting]));
  const globalCommission = settingByKey.get('global')?.commissionPercent || 0;
  let grossEarnings = 0;
  let commission = 0;
  let codCashCollected = 0;
  let onlineGross = 0;

  for (const booking of bookings) {
    const approvedAddOns = booking.addOns
      .filter(addOn => addOn.status === 'approved')
      .reduce((sum, addOn) => sum + addOn.price, 0);
    const gross = Math.max(0, booking.serviceCharge - booking.discountAmount + approvedAddOns);
    const categoryCommission = settingByKey.get(`category:${booking.category}`)?.commissionPercent;
    const percentage = booking.commissionPercent
      ?? (categoryCommission === undefined ? globalCommission : categoryCommission);
    const fee = gross * percentage / 100;
    grossEarnings += gross;
    commission += fee;
    if (booking.paymentMethod === 'cod') codCashCollected += booking.totalAmount;
    else onlineGross += gross;
  }

  return {
    completedJobs: bookings.length,
    grossEarnings: roundMoney(grossEarnings),
    platformCommission: roundMoney(commission),
    codCashCollected: roundMoney(codCashCollected),
    netWithdrawable: roundMoney(onlineGross - commission)
  };
}

function roundMoney(value) {
  return Math.round(value * 100) / 100;
}
async function recalcRating(technicianId) {
  const rows = await Booking.find({ technicianId, status: 'completed', 'review.rating': { $ne: null } }).select('review.rating');
  const total = rows.reduce((sum, r) => sum + r.review.rating, 0);
  await Technician.findByIdAndUpdate(technicianId, { rating: rows.length ? Math.round((total / rows.length) * 10) / 10 : 0, reviewCount: rows.length });
}
module.exports = {
  getProfileByUserId,
  registerTechnician,
  listApprovedForCustomer,
  getById,
  updateProfile,
  earningsSummary,
  recalcRating
};
