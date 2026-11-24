const ServiceItem = require('../models/ServiceItem');

async function list(query = {}) {
  const filter = { isActive: true };
  if (query.category) filter.category = query.category;
  if (query.type && ['service', 'package'].includes(query.type)) filter.type = query.type;
  const items = await ServiceItem.find(filter)
    .sort({ category: 1, type: 1, name: 1 })
    .populate({ path: 'category', match: { isActive: true }, select: 'name description icon parentCategory' })
    .populate({ path: 'frequentlyAddedTogether', match: { isActive: true }, select: 'name price durationMinutes type' });
  return items.filter(item => item.category).map(withActiveSpareParts);
}

async function getById(id) {
  const item = await ServiceItem.findOne({ _id: id, isActive: true })
    .populate({ path: 'category', match: { isActive: true }, select: 'name description icon parentCategory' })
    .populate({ path: 'frequentlyAddedTogether', match: { isActive: true }, select: 'name price durationMinutes type' });
  if (!item?.category) {
    const error = new Error('Service item not found');
    error.statusCode = 404;
    throw error;
  }
  return withActiveSpareParts(item);
}

function withActiveSpareParts(item) {
  item.spareParts = item.spareParts.filter(part => part.isActive);
  return item;
}

module.exports = { list, getById };
