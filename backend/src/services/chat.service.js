const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Message = require('../models/Message');
const Technician = require('../models/Technician');
const User = require('../models/User');

const readableBookingStatuses = ['accepted', 'on_the_way', 'in_progress', 'completed', 'cancelled'];
const writableBookingStatuses = ['accepted', 'in_progress'];
const phoneNumberPattern = /(?:^|[^\d])(?:\d[\s().-]*){10}(?!\d)/;

function httpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function validateId(id, label) {
  if (!mongoose.isValidObjectId(id)) throw httpError(`Invalid ${label}`, 400);
}

function validateMessage(text) {
  if (typeof text !== 'string') throw httpError('Message text is required', 400);
  const normalized = text.trim();
  if (!normalized || normalized.length > 1000) throw httpError('Message must be 1 to 1000 characters', 400);
  if (phoneNumberPattern.test(normalized)) {
    throw httpError('Sharing phone numbers in chat is not allowed', 400);
  }
  return normalized;
}

async function getBookingForUser(bookingId, user) {
  validateId(bookingId, 'booking ID');
  const booking = await Booking.findById(bookingId).select('customerId technicianId status chatEnabledAt');
  if (!booking) throw httpError('Booking not found', 404);
  let isParticipant = String(booking.customerId) === String(user.id);
  if (user.role === 'technician' && booking.technicianId) {
    const technician = await Technician.findOne({ userId: user.id }).select('_id');
    isParticipant = Boolean(technician && String(booking.technicianId) === String(technician._id));
  }
  if (!isParticipant) throw httpError('Not authorized to access this booking chat', 403);
  if (!booking.chatEnabledAt || !readableBookingStatuses.includes(booking.status)) {
    throw httpError('Booking chat is unavailable before the booking is accepted', 409);
  }
  return booking;
}

async function listBookingMessages(bookingId, user) {
  const booking = await getBookingForUser(bookingId, user);
  const messages = await Message.find({
    chatType: 'booking',
    bookingId: booking._id,
    createdAt: { $gte: booking.chatEnabledAt }
  }).sort({ createdAt: -1, _id: -1 }).limit(100).lean();
  return messages.reverse();
}

async function sendBookingMessage(bookingId, user, text) {
  const booking = await getBookingForUser(bookingId, user);
  if (!writableBookingStatuses.includes(booking.status)) {
    throw httpError('Booking chat is read-only', 409);
  }
  const message = await Message.create({
    chatType: 'booking',
    bookingId: booking._id,
    threadUserId: booking.customerId,
    senderId: user.id,
    senderRole: user.role,
    text: validateMessage(text)
  });
  return message.toObject();
}

async function listSupportMessages(userId) {
  const messages = await Message.find({ chatType: 'support', threadUserId: userId })
    .sort({ createdAt: -1, _id: -1 })
    .limit(100)
    .lean();
  return messages.reverse();
}

async function sendSupportMessage(user, text) {
  const message = await Message.create({
    chatType: 'support',
    threadUserId: user.id,
    senderId: user.id,
    senderRole: user.role,
    text: validateMessage(text)
  });
  return message.toObject();
}

async function listSupportThreads() {
  const threads = await Message.aggregate([
    { $match: { chatType: 'support' } },
    { $sort: { createdAt: -1, _id: -1 } },
    {
      $group: {
        _id: '$threadUserId',
        latestMessage: { $first: '$$ROOT' },
        messageCount: { $sum: 1 },
        unreadCount: {
          $sum: {
            $cond: [
              { $and: [{ $ne: ['$isRead', true] }, { $ne: ['$senderRole', 'admin'] }] },
              1,
              0
            ]
          }
        }
      }
    },
    { $sort: { unreadCount: -1, 'latestMessage.createdAt': -1 } },
    { $limit: 100 }
  ]);
  if (!threads.length) return [];
  const users = await User.find({ _id: { $in: threads.map(thread => thread._id) } })
    .select('name role')
    .lean();
  const userById = new Map(users.map(user => [String(user._id), user]));
  return threads.map(thread => ({
    threadUser: userById.get(String(thread._id)) || null,
    latestMessage: thread.latestMessage,
    messageCount: thread.messageCount,
    unreadCount: thread.unreadCount
  })).filter(thread => thread.threadUser);
}

async function validateSupportThreadUser(threadUserId) {
  validateId(threadUserId, 'support user ID');
  const user = await User.findById(threadUserId).select('name role');
  if (!user || !['customer', 'technician'].includes(user.role)) {
    throw httpError('Support thread not found', 404);
  }
  return user;
}

async function listAdminSupportMessages(threadUserId) {
  await validateSupportThreadUser(threadUserId);
  return listSupportMessages(threadUserId);
}

async function sendAdminSupportMessage(adminId, threadUserId, text) {
  await validateSupportThreadUser(threadUserId);
  const message = await Message.create({
    chatType: 'support',
    threadUserId,
    senderId: adminId,
    senderRole: 'admin',
    text: validateMessage(text)
  });
  return message.toObject();
}

async function markRead(user, data = {}) {
  const { bookingId, threadUserId } = data;
  if (Boolean(bookingId) === Boolean(threadUserId)) {
    throw httpError('Provide exactly one of bookingId or threadUserId', 400);
  }

  if (bookingId) {
    if (!['customer', 'technician'].includes(user.role)) {
      throw httpError('Not authorized to mark this booking chat as read', 403);
    }
    const booking = await getBookingForUser(bookingId, user);
    const result = await Message.updateMany({
      chatType: 'booking',
      bookingId: booking._id,
      createdAt: { $gte: booking.chatEnabledAt },
      senderId: { $ne: user.id },
      isRead: { $ne: true }
    }, { $set: { isRead: true } });
    return { modifiedCount: result.modifiedCount };
  }

  validateId(threadUserId, 'support user ID');
  let senderFilter;
  if (user.role === 'admin') {
    await validateSupportThreadUser(threadUserId);
    senderFilter = { senderRole: { $in: ['customer', 'technician'] } };
  } else if (['customer', 'technician'].includes(user.role) && String(threadUserId) === String(user.id)) {
    senderFilter = { senderId: { $ne: user.id } };
  } else {
    throw httpError('Not authorized to mark this support thread as read', 403);
  }
  const result = await Message.updateMany({
    chatType: 'support',
    threadUserId,
    ...senderFilter,
    isRead: { $ne: true }
  }, { $set: { isRead: true } });
  return { modifiedCount: result.modifiedCount };
}

async function unreadSummary(user) {
  const userObjectId = new mongoose.Types.ObjectId(user.id);
  let bookings = [];
  if (user.role === 'customer') {
    bookings = await Booking.find({
      customerId: user.id,
      chatEnabledAt: { $ne: null },
      status: { $in: readableBookingStatuses }
    }).select('_id').lean();
  } else if (user.role === 'technician') {
    const technician = await Technician.findOne({ userId: user.id }).select('_id').lean();
    if (technician) {
      bookings = await Booking.find({
        technicianId: technician._id,
        chatEnabledAt: { $ne: null },
        status: { $in: readableBookingStatuses }
      }).select('_id').lean();
    }
  }

  let bookingUnreadMap = {};
  if (bookings.length) {
    const counts = await Message.aggregate([
      {
        $match: {
          chatType: 'booking',
          bookingId: { $in: bookings.map(booking => booking._id) },
          senderId: { $ne: userObjectId },
          isRead: { $ne: true }
        }
      },
      {
        $lookup: {
          from: Booking.collection.name,
          localField: 'bookingId',
          foreignField: '_id',
          as: 'booking'
        }
      },
      { $unwind: '$booking' },
      {
        $match: {
          $expr: {
            $and: [
              { $ne: ['$booking.chatEnabledAt', null] },
              { $gte: ['$createdAt', '$booking.chatEnabledAt'] }
            ]
          }
        }
      },
      { $group: { _id: '$bookingId', count: { $sum: 1 } } }
    ]);
    bookingUnreadMap = Object.fromEntries(counts.map(item => [String(item._id), item.count]));
  }

  let supportUnreadCount = 0;
  let supportUnreadMap = {};
  if (user.role === 'admin') {
    const counts = await Message.aggregate([
      { $match: { chatType: 'support' } },
      {
        $group: {
          _id: '$threadUserId',
          count: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $in: ['$senderRole', ['customer', 'technician']] },
                    { $ne: ['$isRead', true] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]);
    supportUnreadMap = Object.fromEntries(counts.map(item => [String(item._id), item.count]));
    supportUnreadCount = counts.reduce((total, item) => total + item.count, 0);
  } else if (['customer', 'technician'].includes(user.role)) {
    supportUnreadCount = await Message.countDocuments({
      chatType: 'support',
      threadUserId: user.id,
      senderId: { $ne: user.id },
      isRead: { $ne: true }
    });
  }

  const bookingTotal = Object.values(bookingUnreadMap).reduce((total, count) => total + count, 0);
  return {
    totalUnread: bookingTotal + supportUnreadCount,
    bookingUnreadMap,
    supportUnreadCount: user.role === 'admin' ? 0 : supportUnreadCount,
    ...(user.role === 'admin' ? { supportUnreadMap } : {})
  };
}

module.exports = {
  listBookingMessages,
  sendBookingMessage,
  listSupportMessages,
  sendSupportMessage,
  listSupportThreads,
  listAdminSupportMessages,
  sendAdminSupportMessage,
  markRead,
  unreadSummary
};
