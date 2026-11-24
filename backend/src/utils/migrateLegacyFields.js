const Booking = require('../models/Booking');
const Technician = require('../models/Technician');

async function migrateLegacyFields() {
  await Technician.updateMany(
    { isOnline: { $exists: false }, availability: false },
    { $set: { isOnline: false } }
  );
  await Technician.updateMany(
    { isOnline: { $exists: false } },
    { $set: { isOnline: true } }
  );

  const cursor = Booking.find({
    $or: [
      { totalAmount: { $exists: false } },
      { paymentMethod: { $exists: false } },
      { paymentStatus: { $exists: false } },
      { scheduledDate: { $exists: false } },
      { chatEnabledAt: null, status: { $in: ['accepted', 'on_the_way', 'in_progress', 'completed'] } }
    ]
  }).select('_id serviceCharge status scheduledFor totalAmount paymentMethod paymentStatus scheduledDate chatEnabledAt createdAt updatedAt').lean().cursor();

  for await (const booking of cursor) {
    const update = {};
    if (booking.totalAmount === undefined) update.totalAmount = booking.serviceCharge || 0;
    if (booking.paymentMethod === undefined) update.paymentMethod = 'cod';
    if (booking.paymentStatus === undefined) {
      update.paymentStatus = booking.status === 'completed' ? 'succeeded' : 'pending';
    }
    if (booking.scheduledDate === undefined) update.scheduledDate = booking.scheduledFor || null;
    if (!booking.chatEnabledAt && ['accepted', 'on_the_way', 'in_progress', 'completed'].includes(booking.status)) {
      update.chatEnabledAt = booking.updatedAt || booking.createdAt || new Date();
    }
    if (Object.keys(update).length) await Booking.updateOne({ _id: booking._id }, { $set: update });
  }
}

module.exports = migrateLegacyFields;
