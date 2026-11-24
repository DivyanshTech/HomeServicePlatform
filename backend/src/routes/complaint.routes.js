const router = require('express').Router();
const protect = require('../middleware/auth.middleware');
const role = require('../middleware/role.middleware');
const controller = require('../controllers/complaint.controller');

router.post('/bookings/:bookingId', protect, role('customer'), controller.create);
router.get('/my', protect, role('customer'), controller.myList);
router.get('/technician', protect, role('technician'), controller.technicianList);

module.exports = router;
