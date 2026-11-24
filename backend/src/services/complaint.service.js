const Booking = require('../models/Booking');
const Complaint = require('../models/Complaint');
const Technician = require('../models/Technician');

function httpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function create(bookingId, customerId, description) {
  const text = typeof description === 'string' ? description.trim() : '';
  if (text.length < 10 || text.length > 2000) {
    throw httpError('Complaint must be between 10 and 2000 characters', 400);
  }

  const booking = await Booking.findById(bookingId);
  if (!booking) throw httpError('Booking not found', 404);
  if (String(booking.customerId) !== String(customerId)) {
    throw httpError('You can only report a booking from your account', 403);
  }

  try {
    const complaint = await Complaint.create({
      bookingId: booking._id,
      customerId,
      technicianId: booking.technicianId,
      description: text
    });
    return Complaint.findById(complaint._id)
      .populate('bookingId', 'category status createdAt')
      .populate('technicianId', 'category');
  } catch (error) {
    if (error.code === 11000) {
      throw httpError('A complaint has already been submitted for this booking', 409);
    }
    throw error;
  }
}

async function listForCustomer(customerId) {
  return Complaint.find({ customerId }).sort({ createdAt: -1 }).select('bookingId status createdAt');
}

async function listForTechnician(userId) {
  const technician = await Technician.findOne({ userId }).select('_id');
  if (!technician) throw httpError('Technician profile not found', 404);
  return Complaint.find({ technicianId: technician._id })
    .sort({ createdAt: -1 })
    .select('bookingId description status adminNote createdAt updatedAt')
    .populate('bookingId', 'category status')
    .populate('bookingId.category', 'name');
}

module.exports = { create, listForCustomer, listForTechnician };
