const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async function protect(req, res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  let decoded;
  try {
    decoded = jwt.verify(header.slice(7), process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ success: false, message: 'Token invalid or expired' });
  }

  if (!decoded?.id) {
    return res.status(401).json({ success: false, message: 'Token invalid or expired' });
  }

  try {
    const user = await User.findById(decoded.id).select('role isActive');
    if (!user) return res.status(401).json({ success: false, message: 'Account not found' });
    if (!user.isActive) return res.status(403).json({ success: false, message: 'Account is inactive' });
    req.user = { id: user._id.toString(), role: user.role };
    return next();
  } catch (error) {
    return next(error);
  }
};
