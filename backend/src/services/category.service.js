const Category = require('../models/Category');

async function list() {
  return Category.find({ isActive: true })
    .sort({ parentCategory: 1, name: 1 })
    .populate('parentCategory', 'name');
}

module.exports = { list };
