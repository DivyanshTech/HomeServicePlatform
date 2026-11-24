const service = require('../services/serviceItem.service');

exports.list = async (req, res, next) => {
  try {
    res.json({ success: true, data: await service.list(req.query) });
  } catch (error) {
    next(error);
  }
};

exports.get = async (req, res, next) => {
  try {
    res.json({ success: true, data: await service.getById(req.params.id) });
  } catch (error) {
    next(error);
  }
};
