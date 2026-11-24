const service = require('../services/chat.service');

exports.bookingMessages = async (req, res, next) => {
  try {
    res.json({ success: true, data: await service.listBookingMessages(req.params.bookingId, req.user) });
  } catch (error) {
    next(error);
  }
};

exports.sendBookingMessage = async (req, res, next) => {
  try {
    res.status(201).json({
      success: true,
      data: await service.sendBookingMessage(req.params.bookingId, req.user, (req.body || {}).text)
    });
  } catch (error) {
    next(error);
  }
};

exports.supportMessages = async (req, res, next) => {
  try {
    res.json({ success: true, data: await service.listSupportMessages(req.user.id) });
  } catch (error) {
    next(error);
  }
};

exports.sendSupportMessage = async (req, res, next) => {
  try {
    res.status(201).json({
      success: true,
      data: await service.sendSupportMessage(req.user, (req.body || {}).text)
    });
  } catch (error) {
    next(error);
  }
};

exports.supportThreads = async (req, res, next) => {
  try {
    res.json({ success: true, data: await service.listSupportThreads() });
  } catch (error) {
    next(error);
  }
};

exports.adminSupportMessages = async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: await service.listAdminSupportMessages(req.params.threadUserId)
    });
  } catch (error) {
    next(error);
  }
};

exports.sendAdminSupportMessage = async (req, res, next) => {
  try {
    res.status(201).json({
      success: true,
      data: await service.sendAdminSupportMessage(req.user.id, req.params.threadUserId, (req.body || {}).text)
    });
  } catch (error) {
    next(error);
  }
};

exports.markRead = async (req, res, next) => {
  try {
    res.json({ success: true, data: await service.markRead(req.user, req.body || {}) });
  } catch (error) {
    next(error);
  }
};

exports.unreadSummary = async (req, res, next) => {
  try {
    res.json({ success: true, data: await service.unreadSummary(req.user) });
  } catch (error) {
    next(error);
  }
};
