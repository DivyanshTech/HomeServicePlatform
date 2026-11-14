const Technician = require('../models/Technician');
const User = require('../models/User');
const Booking = require('../models/Booking');
const Category = require('../models/Category');
const query = q => q.populate('userId','name phone email city locality address').populate('category','name description icon');
async function pending() { return query(Technician.find({isApproved:false}).sort({createdAt:1})); }
async function approve(id) { const t = await Technician.findById(id); if (!t) throw new Error('Technician application not found'); t.isApproved=true; t.approvedAt=new Date(); await t.save(); return query(Technician.findById(id)); }
async function reject(id) { const t=await Technician.findById(id); if(!t) throw new Error('Technician application not found'); await Technician.findByIdAndDelete(id); await User.findByIdAndUpdate(t.userId,{role:'customer'}); return {message:'Application rejected'}; }
async function stats() { const [customers,technicians,approved,pendingCount,bookings,completed] = await Promise.all([User.countDocuments({role:'customer'}),Technician.countDocuments(),Technician.countDocuments({isApproved:true}),Technician.countDocuments({isApproved:false}),Booking.countDocuments(),Booking.countDocuments({status:'completed'})]); return {customers,technicians,approvedTechnicians:approved,pendingTechnicians:pendingCount,bookings,completedBookings:completed}; }
async function categories() { return Category.find({isActive:true}).sort({name:1}); }
module.exports = { pending, approve, reject, stats, categories };
