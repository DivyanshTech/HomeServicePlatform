const service = require('../services/complaint.service');

exports.create = async (req, res, next) => {
  try {
    res.status(201).json({
      success: true,
      data: await service.create(req.params.bookingId, req.user.id, req.body.description),
      message: 'Complaint submitted for admin review'
    });
  } catch (error) {
    next(error);
  }
};

exports.myList = async (req, res, next) => {
  try {
    res.json({ success: true, data: await service.listForCustomer(req.user.id) });
  } catch (error) {
    next(error);
  }
};

exports.technicianList = async (req, res, next) => {
  try {
    res.json({ success: true, data: await service.listForTechnician(req.user.id) });
  } catch (error) {
    next(error);
  }
};
