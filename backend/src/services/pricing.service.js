const Coupon = require('../models/Coupon');
const CommissionSetting = require('../models/CommissionSetting');

function httpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function getPricingSettings(categoryId) {
  if (categoryId) {
    const categorySetting = await CommissionSetting.findOne({ key: `category:${categoryId}` });
    if (categorySetting) return categorySetting;
  }
  return CommissionSetting.findOne({ key: 'global' });
}

async function calculateCouponDiscount(code, subtotal) {
  if (!code) return { code: '', discountAmount: 0 };
  const normalizedCode = String(code).trim().toUpperCase();
  const coupon = await Coupon.findOne({ code: normalizedCode, isActive: true });
  const now = new Date();
  if (!coupon || (coupon.startsAt && coupon.startsAt > now) || (coupon.expiresAt && coupon.expiresAt < now)) {
    throw httpError('Coupon is invalid or inactive', 400);
  }
  if (subtotal < coupon.minOrder) throw httpError(`Minimum order for this coupon is ${coupon.minOrder}`, 400);

  const rawDiscount = coupon.discountType === 'percentage'
    ? subtotal * coupon.discountValue / 100
    : coupon.discountValue;
  return {
    code: coupon.code,
    discountAmount: Math.round(Math.min(subtotal, rawDiscount) * 100) / 100
  };
}

module.exports = { getPricingSettings, calculateCouponDiscount };
