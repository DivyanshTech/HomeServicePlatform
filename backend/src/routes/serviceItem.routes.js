const router = require('express').Router();
const controller = require('../controllers/serviceItem.controller');

router.get('/', controller.list);
router.get('/:id', controller.get);

module.exports = router;
