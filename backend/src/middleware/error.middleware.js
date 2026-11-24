module.exports = (err, req, res, next) => {
  console.error(err);
  const status = err.statusCode
    || (err.name === 'ValidationError' || err.name === 'CastError' ? 400 : 0)
    || (err.name === 'VersionError' ? 409 : 0)
    || (err.code === 11000 ? 409 : 500);
  const message = err.code === 11000 ? 'A record with that value already exists' : err.message;
  res.status(status).json({ success: false, message: message || 'Internal server error' });
};
