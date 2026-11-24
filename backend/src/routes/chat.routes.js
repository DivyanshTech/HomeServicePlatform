const router = require('express').Router();
const protect = require('../middleware/auth.middleware');
const role = require('../middleware/role.middleware');
const controller = require('../controllers/chat.controller');

router.use(protect);
router.get('/unread-summary', controller.unreadSummary);
router.patch('/mark-read', role('customer', 'technician', 'admin'), controller.markRead);
router.get('/bookings/:bookingId', role('customer', 'technician'), controller.bookingMessages);
router.post('/bookings/:bookingId', role('customer', 'technician'), controller.sendBookingMessage);
router.get('/support/threads', role('admin'), controller.supportThreads);
router.get('/support/threads/:threadUserId', role('admin'), controller.adminSupportMessages);
router.post('/support/threads/:threadUserId', role('admin'), controller.sendAdminSupportMessage);
router.get('/support', role('customer', 'technician'), controller.supportMessages);
router.post('/support', role('customer', 'technician'), controller.sendSupportMessage);

module.exports = router;
