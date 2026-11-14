const Booking = require('../models/Booking');
const Technician = require('../models/Technician');
const Category = require('../models/Category');
const User = require('../models/User');
const technicianService = require('./technician.service');

const populate = q => q.populate('customerId','name phone city locality address').populate({ path:'technicianId', populate:[{path:'userId',select:'name phone city locality address'},{path:'category',select:'name description'}] }).populate('category','name description icon');

async function create(customerId, data) {
  const [customer, tech] = await Promise.all([User.findById(customerId), Technician.findById(data.technicianId).populate('category')]);
  if (!customer || customer.role !== 'customer') throw new Error('Customer account not found');
  if (!tech || !tech.isApproved || !tech.availability) throw new Error('Technician is not available');
  const techUser = await User.findById(tech.userId).select('city locality');
  if (customer.city.trim().toLowerCase() !== techUser.city.trim().toLowerCase() || (customer.locality && customer.locality.trim().toLowerCase() !== (techUser.locality || '').trim().toLowerCase())) throw new Error('Technician is outside your selected locality');
  if (String(tech.category._id) !== String(data.category)) throw new Error('Category does not match technician');
  const booking = await Booking.create({ customerId, technicianId: tech._id, category: data.category, issueDescription: data.issueDescription, issueImage: data.issueImage || '', serviceCharge: tech.serviceCharge, scheduledFor: data.scheduledFor || null });
  return populate(Booking.findById(booking._id));
}
async function listForCustomer(id) { return populate(Booking.find({ customerId:id }).sort({createdAt:-1})); }
async function listForTechnician(userId) { const tech = await Technician.findOne({userId}); if (!tech) throw new Error('Technician profile not found'); if (!tech.isApproved) throw new Error('Technician application is still pending'); return populate(Booking.find({technicianId:tech._id}).sort({createdAt:-1})); }
async function getById(id, actor) { const b = await populate(Booking.findById(id)); if (!b) throw new Error('Booking not found'); const customerOk=String(b.customerId._id)===String(actor.id); const technicianOk=b.technicianId?.userId && String(b.technicianId.userId._id)===String(actor.id); if (actor.role!=='admin'&&!customerOk&&!technicianOk) throw new Error('Not authorized'); return b; }
async function transition(id, userId, action) {
  const booking = await Booking.findById(id); if (!booking) throw new Error('Booking not found');
  const tech = await Technician.findById(booking.technicianId); const isTech = tech && tech.isApproved && String(tech.userId)===String(userId);
  const isCustomer = String(booking.customerId)===String(userId);
  const map = { accept:['pending','accepted'], start:['accepted','in_progress'], complete:['in_progress','completed'], reject:['pending','cancelled'], cancel:['pending','cancelled'] };
  if (action === 'cancel') { if (!isCustomer || !['pending','accepted'].includes(booking.status)) throw new Error('Booking cannot be cancelled'); }
  else if (action === 'reject') { if (!isTech || booking.status!=='pending') throw new Error('Booking cannot be rejected'); }
  else { if (!isTech || booking.status !== map[action][0]) throw new Error('Invalid booking status transition'); }
  booking.status = action==='cancel'||action==='reject' ? 'cancelled' : map[action][1];
  await booking.save();
  if (booking.status === 'completed') await Technician.findByIdAndUpdate(booking.technicianId, {$inc:{totalJobs:1}});
  return populate(Booking.findById(booking._id));
}
async function review(id, customerId, rating, comment) {
  const b = await Booking.findById(id); if (!b) throw new Error('Booking not found');
  if (String(b.customerId)!==String(customerId)) throw new Error('Not authorized');
  if (b.status!=='completed') throw new Error('Review is available only after completion');
  if (b.review?.rating) throw new Error('Review already submitted');
  b.review = { rating, comment: comment || '', createdAt: new Date() }; await b.save(); await technicianService.recalcRating(b.technicianId); return populate(Booking.findById(b._id));
}
module.exports = { create, listForCustomer, listForTechnician, getById, transition, review };
