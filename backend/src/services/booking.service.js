const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Technician = require('../models/Technician');
const Category = require('../models/Category');
const ServiceItem = require('../models/ServiceItem');
const User = require('../models/User');
const pricingService = require('./pricing.service');
const scheduleService = require('./schedule.service');
const technicianService = require('./technician.service');

const populate = async query => {
  const result = await query
    .populate('customerId','name phone city locality address')
    .populate({
      path: 'technicianId',
      populate: [
        { path: 'userId', select: 'name city locality address' },
        { path: 'category', select: 'name description' }
      ]
    })
    .populate('category', 'name description icon')
    .populate('serviceItemId', 'name type price durationMinutes');
  const hideUnqualifiedCustomerPhone = booking => {
    if (booking?.customerId && !['accepted', 'in_progress'].includes(booking.status)) {
      booking.customerId.phone = undefined;
    }
    return booking;
  };
  return Array.isArray(result) ? result.map(hideUnqualifiedCustomerPhone) : hideUnqualifiedCustomerPhone(result);
};

function httpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function requireObjectId(id, label) {
  if (!mongoose.isValidObjectId(id)) throw httpError(`Invalid ${label}`, 400);
}

function normalizeScheduleDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw httpError('Invalid scheduled date', 400);
  return date;
}

async function buildQuote(customerId, data) {
  const customer = await User.findById(customerId).select('role city locality');
  if (!customer || customer.role !== 'customer') throw httpError('Customer account not found', 404);

  let item = null;
  let technician = null;
  if (data.serviceItemId) {
    requireObjectId(data.serviceItemId, 'service item');
    item = await ServiceItem.findOne({ _id: data.serviceItemId, isActive: true }).populate('category');
    if (!item) throw httpError('Service item is not available', 404);
  }
  if (data.technicianId) {
    requireObjectId(data.technicianId, 'technician');
    technician = await Technician.findById(data.technicianId).populate('category');
    if (!technician || !technician.isApproved || !technician.availability || !technician.isOnline) {
      throw httpError('Technician is not available', 400);
    }
    const technicianUser = await User.findById(technician.userId).select('city locality isActive');
    if (!technicianUser?.isActive) throw httpError('Technician account is inactive', 400);
    if (customer.city.trim().toLowerCase() !== technicianUser.city.trim().toLowerCase()
      || (customer.locality && customer.locality.trim().toLowerCase() !== (technicianUser.locality || '').trim().toLowerCase())) {
      throw httpError('Technician is outside your selected locality', 400);
    }
  }

  const categoryId = item?.category?._id || technician?.category?._id || data.category;
  if (!categoryId || !mongoose.isValidObjectId(categoryId)) {
    throw httpError('A valid service category is required', 400);
  }
  const category = await Category.findOne({ _id: categoryId, isActive: true });
  if (!category) throw httpError('Service category is not available', 404);
  if (technician && String(technician.category._id) !== String(category._id)) {
    throw httpError('Category does not match technician', 400);
  }

  const subtotal = item ? item.price : technician?.serviceCharge;
  if (!Number.isFinite(subtotal) || subtotal < 0) {
    throw httpError('Choose a service item or technician to get a valid price', 400);
  }

  const settings = await pricingService.getPricingSettings(category._id);
  const coupon = await pricingService.calculateCouponDiscount(data.couponCode, subtotal);
  const platformFee = settings?.platformFee || 0;
  return {
    category: category._id,
    item,
    technician,
    subtotal,
    couponCode: coupon.code,
    discountAmount: coupon.discountAmount,
    platformFee,
    commissionPercent: settings?.commissionPercent || 0,
    totalAmount: Math.max(0, Math.round((subtotal + platformFee - coupon.discountAmount) * 100) / 100)
  };
}

async function quote(customerId, data = {}) {
  const result = await buildQuote(customerId, data);
  return {
    serviceName: result.item?.name || result.technician?.category?.name || 'Home service',
    serviceCharge: result.subtotal,
    platformFee: result.platformFee,
    couponCode: result.couponCode,
    discountAmount: result.discountAmount,
    totalAmount: result.totalAmount
  };
}

async function create(customerId, data = {}) {
  const result = await buildQuote(customerId, data);
  const issueDescription = String(data.issueDescription || '').trim()
    || (result.item ? `Booking for ${result.item.name}` : '');
  if (!issueDescription) throw httpError('Issue description is required', 400);
  if (issueDescription.length > 1000) throw httpError('Issue description must be 1000 characters or fewer', 400);

  const scheduledFor = normalizeScheduleDate(data.scheduledDate || data.scheduledFor);
  if (scheduledFor && scheduledFor <= new Date()) throw httpError('Scheduled date must be in the future', 400);
  const timeSlot = typeof data.timeSlot === 'string' ? data.timeSlot.trim() : '';
  if (data.timeSlot !== undefined && (typeof data.timeSlot !== 'string' || data.timeSlot.length > 80)) {
    throw httpError('Invalid time slot', 400);
  }
  if (timeSlot && !scheduledFor) throw httpError('A scheduled date is required when selecting a time slot', 400);
  if (timeSlot) scheduleService.parseTimeSlot(timeSlot);
  if (scheduledFor && result.technician) {
    await scheduleService.assertTechnicianSchedule(result.technician, scheduledFor, timeSlot);
  }
  const paymentMethod = data.paymentMethod || 'cod';
  if (!['online_mock', 'cod'].includes(paymentMethod)) throw httpError('Invalid payment method', 400);
  const booking = await Booking.create({
    customerId,
    technicianId: result.technician?._id || null,
    category: result.category,
    serviceItemId: result.item?._id || null,
    serviceName: result.item?.name || result.technician?.category?.name || '',
    issueDescription,
    issueImage: data.issueImage || '',
    serviceCharge: result.subtotal,
    scheduledFor,
    scheduledDate: scheduledFor,
    timeSlot,
    paymentMethod,
    paymentStatus: 'pending',
    couponCode: result.couponCode,
    discountAmount: result.discountAmount,
    platformFee: result.platformFee,
    commissionPercent: result.commissionPercent,
    totalAmount: result.totalAmount
  });
  return populate(Booking.findById(booking._id));
}

async function listForCustomer(id) {
  return populate(Booking.find({ customerId: id }).sort({ createdAt: -1 }));
}

async function listForTechnician(userId) {
  const tech = await Technician.findOne({ userId });
  if (!tech) throw httpError('Technician profile not found', 404);
  if (!tech.isApproved) throw httpError('Technician application is still pending', 403);
  return populate(Booking.find({ technicianId: tech._id }).sort({ createdAt: -1 }));
}

async function getById(id, actor) {
  requireObjectId(id, 'booking ID');
  const booking = await populate(Booking.findById(id));
  if (!booking) throw httpError('Booking not found', 404);
  const customerOk = booking.customerId && String(booking.customerId._id) === String(actor.id);
  const technicianOk = booking.technicianId?.userId
    && String(booking.technicianId.userId._id) === String(actor.id);
  if (actor.role !== 'admin' && !customerOk && !technicianOk) throw httpError('Not authorized', 403);
  return booking;
}

async function transition(id, userId, action) {
  requireObjectId(id, 'booking ID');
  const booking = await Booking.findById(id);
  if (!booking) throw httpError('Booking not found', 404);
  const technician = booking.technicianId ? await Technician.findById(booking.technicianId) : null;
  const isTechnician = technician?.isApproved && String(technician.userId) === String(userId);
  const isCustomer = String(booking.customerId) === String(userId);

  if (action === 'accept') {
    if (!isTechnician || booking.status !== 'pending') throw httpError('Booking cannot be accepted', 409);
    if (booking.paymentMethod === 'online_mock' && booking.paymentStatus !== 'succeeded') {
      throw httpError('Online mock payment must succeed before accepting this booking', 409);
    }
    booking.status = 'accepted';
    if (!booking.chatEnabledAt) booking.chatEnabledAt = new Date();
  } else if (action === 'on-the-way') {
    if (!isTechnician || booking.status !== 'accepted') throw httpError('Booking cannot move to on the way', 409);
    booking.status = 'on_the_way';
  } else if (action === 'start') {
    if (!isTechnician || !['accepted', 'on_the_way'].includes(booking.status)) {
      throw httpError('Booking cannot be started', 409);
    }
    booking.status = 'in_progress';
  } else if (action === 'complete') {
    if (!isTechnician || booking.status !== 'in_progress') throw httpError('Booking cannot be completed', 409);
    if (booking.addOns.some(addOn => addOn.status === 'pending')) {
      throw httpError('Resolve all pending add-on requests before completing the job', 409);
    }
    booking.status = 'completed';
    booking.warrantyExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    if (booking.paymentMethod === 'cod') booking.paymentStatus = 'succeeded';
  } else if (action === 'reject') {
    if (!isTechnician || booking.status !== 'pending') throw httpError('Booking cannot be rejected', 409);
    booking.status = 'cancelled';
  } else if (action === 'cancel') {
    if (!isCustomer || !['pending', 'accepted', 'on_the_way'].includes(booking.status)) {
      throw httpError('Booking cannot be cancelled', 409);
    }
    booking.status = 'cancelled';
  } else {
    throw httpError('Unknown booking action', 400);
  }

  try {
    await booking.save();
  } catch (error) {
    if (error.name === 'VersionError') throw httpError('Booking changed concurrently; refresh and try again', 409);
    throw error;
  }
  if (booking.status === 'completed') {
    await Technician.findByIdAndUpdate(booking.technicianId, { $inc: { totalJobs: 1 } });
  }
  return populate(Booking.findById(booking._id));
}

async function reschedule(id, customerId, scheduledDate, timeSlot) {
  requireObjectId(id, 'booking ID');
  const date = normalizeScheduleDate(scheduledDate);
  if (!date || date <= new Date()) throw httpError('Choose a future scheduled date', 400);
  if (typeof timeSlot !== 'string' || !timeSlot.trim() || timeSlot.length > 80) {
    throw httpError('A valid time slot is required', 400);
  }
  scheduleService.parseTimeSlot(timeSlot.trim());
  const booking = await Booking.findById(id);
  if (!booking) throw httpError('Booking not found', 404);
  if (String(booking.customerId) !== String(customerId)) throw httpError('Not authorized', 403);
  if (['in_progress', 'completed', 'cancelled'].includes(booking.status)) {
    throw httpError('Booking can no longer be rescheduled', 409);
  }
  if (booking.technicianId) {
    const technician = await Technician.findById(booking.technicianId);
    if (technician) await scheduleService.assertTechnicianSchedule(technician, date, timeSlot.trim(), booking._id);
  }
  booking.scheduledDate = date;
  booking.scheduledFor = date;
  booking.timeSlot = timeSlot.trim();
  try {
    await booking.save();
  } catch (error) {
    if (error.name === 'VersionError') throw httpError('Booking changed concurrently; refresh and try again', 409);
    throw error;
  }
  return populate(Booking.findById(booking._id));
}

async function requestAddOn(id, userId, data) {
  data = data || {};
  requireObjectId(id, 'booking ID');
  if (data.sparePartId && data.serviceItemId) throw httpError('Choose one rate card item per add-on request', 400);
  const booking = await Booking.findById(id);
  if (!booking) throw httpError('Booking not found', 404);
  const technician = booking.technicianId ? await Technician.findById(booking.technicianId) : null;
  if (!technician || String(technician.userId) !== String(userId)) throw httpError('Not authorized', 403);
  if (booking.status !== 'in_progress') throw httpError('Add-ons can only be requested while the job is in progress', 409);
  let addOn;
  if (data.sparePartId) {
    requireObjectId(data.sparePartId, 'spare-part ID');
    const item = await ServiceItem.findOne({
      category: booking.category,
      isActive: true,
      'spareParts._id': data.sparePartId,
      'spareParts.isActive': true
    });
    const part = item?.spareParts.id(data.sparePartId);
    if (!part || !part.isActive) throw httpError('Active spare part rate card item not found for this booking', 404);
    addOn = { name: part.name, price: part.price, sparePartId: part._id };
  } else if (data.serviceItemId) {
    requireObjectId(data.serviceItemId, 'service item ID');
    const item = await ServiceItem.findOne({
      _id: data.serviceItemId,
      category: booking.category,
      isActive: true
    });
    if (!item) throw httpError('Active service rate card item not found for this booking', 404);
    addOn = { name: item.name, price: item.price, serviceItemId: item._id };
  } else {
    throw httpError('Choose a spare part or service from the active rate card', 400);
  }
  booking.addOns.push({ ...addOn, requestedBy: userId });
  await booking.save();
  return populate(Booking.findById(booking._id));
}

async function decideAddOn(id, addOnId, customerId, decision) {
  requireObjectId(id, 'booking ID');
  requireObjectId(addOnId, 'add-on ID');
  if (!['approved', 'rejected'].includes(decision)) throw httpError('Decision must be approved or rejected', 400);
  const booking = await Booking.findById(id);
  if (!booking) throw httpError('Booking not found', 404);
  if (String(booking.customerId) !== String(customerId)) throw httpError('Not authorized', 403);
  if (booking.status !== 'in_progress') throw httpError('Add-on decisions are only available while the job is in progress', 409);
  const addOn = booking.addOns.id(addOnId);
  if (!addOn) throw httpError('Add-on request not found', 404);
  if (addOn.status !== 'pending') throw httpError('Add-on request has already been decided', 409);
  addOn.status = decision;
  addOn.decidedAt = new Date();
  if (decision === 'approved') booking.totalAmount = Math.round((booking.totalAmount + addOn.price) * 100) / 100;
  await booking.save();
  return populate(Booking.findById(booking._id));
}

async function raiseWarrantyClaim(id, customerId, reason) {
  requireObjectId(id, 'booking ID');
  const text = typeof reason === 'string' ? reason.trim() : '';
  if (text.length < 10 || text.length > 1000) throw httpError('Warranty claim reason must be 10 to 1000 characters', 400);
  const booking = await Booking.findById(id);
  if (!booking) throw httpError('Booking not found', 404);
  if (String(booking.customerId) !== String(customerId)) throw httpError('Not authorized', 403);
  if (booking.status !== 'completed' || !booking.warrantyExpiresAt || booking.warrantyExpiresAt < new Date()) {
    throw httpError('The 7-day warranty period has expired or is not active', 409);
  }
  if (booking.warrantyClaim?.requested) throw httpError('A warranty claim has already been submitted', 409);
  booking.warrantyClaim = { requested: true, reason: text, requestedAt: new Date() };
  await booking.save();
  return populate(Booking.findById(booking._id));
}

async function simulatePayment(id, customerId, outcome) {
  requireObjectId(id, 'booking ID');
  if (!['success', 'fail'].includes(outcome)) throw httpError('Payment outcome must be success or fail', 400);
  const booking = await Booking.findById(id);
  if (!booking) throw httpError('Booking not found', 404);
  if (String(booking.customerId) !== String(customerId)) throw httpError('Not authorized', 403);
  if (booking.status !== 'pending' || booking.paymentMethod !== 'online_mock' || booking.paymentStatus === 'succeeded') {
    throw httpError('This booking cannot be charged again', 409);
  }
  booking.paymentStatus = outcome === 'success' ? 'succeeded' : 'failed';
  await booking.save();
  return populate(Booking.findById(booking._id));
}

async function review(id, customerId, rating, comment) {
  requireObjectId(id, 'booking ID');
  const booking = await Booking.findById(id);
  if (!booking) throw httpError('Booking not found', 404);
  if (String(booking.customerId) !== String(customerId)) throw httpError('Not authorized', 403);
  if (booking.status !== 'completed') throw httpError('Review is available only after completion', 409);
  if (booking.review?.rating) throw httpError('Review already submitted', 409);
  booking.review = { rating, comment: comment || '', createdAt: new Date() };
  await booking.save();
  await technicianService.recalcRating(booking.technicianId);
  return populate(Booking.findById(booking._id));
}

module.exports = {
  quote,
  create,
  listForCustomer,
  listForTechnician,
  getById,
  transition,
  reschedule,
  requestAddOn,
  decideAddOn,
  raiseWarrantyClaim,
  simulatePayment,
  review
};
