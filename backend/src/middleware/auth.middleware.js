const jwt = require('jsonwebtoken');

module.exports = function protect(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'Authentication required' });
    const decoded = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    if (!decoded?.id || !decoded?.role) throw new Error('Invalid token');
    req.user = { id: decoded.id, role: decoded.role };
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Token invalid or expired' });
  }
};
