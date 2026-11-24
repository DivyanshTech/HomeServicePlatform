const Booking = require('../models/Booking');

function httpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function parseTimeSlot(timeSlot) {
  const match = timeSlot.match(/^([01]\d|2[0-3]):([0-5]\d)-([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) throw httpError('Time slot must use HH:mm-HH:mm', 400);
  const start = Number(match[1]) * 60 + Number(match[2]);
  const end = Number(match[3]) * 60 + Number(match[4]);
  if (end <= start) throw httpError('Time slot must have a positive duration', 400);
  return { start, end };
}

async function assertTechnicianSchedule(technician, date, timeSlot, bookingId) {
  if (!timeSlot) return;
  const { start, end } = parseTimeSlot(timeSlot);
  const startTime = timeSlot.slice(0, 5);
  const endTime = timeSlot.slice(6);
  if (technician.weeklyAvailability.length) {
    const workingDay = technician.weeklyAvailability.find(day => day.dayOfWeek === date.getDay());
    if (!workingDay?.isWorking
      || startTime < workingDay.startTime
      || endTime > workingDay.endTime) {
      throw httpError('Technician is not working during the selected time slot', 409);
    }
  }
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  const filter = {
    technicianId: technician._id,
    scheduledDate: { $gte: dayStart, $lt: dayEnd },
    status: { $nin: ['cancelled', 'completed'] }
  };
  if (bookingId) filter._id = { $ne: bookingId };
  const existing = await Booking.find(filter).select('timeSlot').lean();
  const overlaps = existing.some(booking => {
    if (!booking.timeSlot) return false;
    const current = parseTimeSlot(booking.timeSlot);
    return start < current.end && current.start < end;
  });
  if (overlaps) throw httpError('Technician is already booked for that time slot', 409);
}

module.exports = { assertTechnicianSchedule, parseTimeSlot };
