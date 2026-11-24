const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  chatType: { type: String, enum: ['booking', 'support'], required: true, index: true },
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
  threadUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  senderRole: { type: String, enum: ['customer', 'technician', 'admin'], required: true },
  text: { type: String, required: true, trim: true, maxlength: 1000 },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

messageSchema.pre('validate', function () {
  if (this.chatType === 'booking' && !this.bookingId) {
    this.invalidate('bookingId', 'Booking chat messages require a booking');
  }
  if (this.chatType === 'support' && this.bookingId) {
    this.invalidate('bookingId', 'Support messages cannot belong to a booking');
  }
});

messageSchema.index({ bookingId: 1, createdAt: 1 });
messageSchema.index({ threadUserId: 1, chatType: 1, createdAt: 1 });
messageSchema.index({ chatType: 1, bookingId: 1, isRead: 1, senderId: 1 });
messageSchema.index({ chatType: 1, threadUserId: 1, isRead: 1, senderId: 1 });

module.exports = mongoose.models.Message || mongoose.model('Message', messageSchema);
