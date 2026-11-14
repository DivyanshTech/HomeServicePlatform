const normalize = value => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
module.exports = { normalize };
