import api from '../api/axios';

const getBookingMessages = bookingId =>
  api.get(`/chat/bookings/${bookingId}`).then(response => response.data);
const sendBookingMessage = (bookingId, text) =>
  api.post(`/chat/bookings/${bookingId}`, { text }).then(response => response.data);
const getSupportMessages = () =>
  api.get('/chat/support').then(response => response.data);
const sendSupportMessage = text =>
  api.post('/chat/support', { text }).then(response => response.data);
const getSupportThreads = () =>
  api.get('/chat/support/threads').then(response => response.data);
const getAdminSupportMessages = threadUserId =>
  api.get(`/chat/support/threads/${threadUserId}`).then(response => response.data);
const sendAdminSupportMessage = (threadUserId, text) =>
  api.post(`/chat/support/threads/${threadUserId}`, { text }).then(response => response.data);
const markRead = thread =>
  api.patch('/chat/mark-read', thread).then(response => response.data);
const getUnreadSummary = () =>
  api.get('/chat/unread-summary').then(response => response.data);

export default {
  getBookingMessages,
  sendBookingMessage,
  getSupportMessages,
  sendSupportMessage,
  getSupportThreads,
  getAdminSupportMessages,
  sendAdminSupportMessage,
  markRead,
  getUnreadSummary
};
