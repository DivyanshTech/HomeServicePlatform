const Technician = require('../models/Technician');
const User = require('../models/User');
const Booking = require('../models/Booking');
const Category = require('../models/Category');
const Complaint = require('../models/Complaint');
const ServiceItem = require('../models/ServiceItem');
const Coupon = require('../models/Coupon');
const CommissionSetting = require('../models/CommissionSetting');
const mongoose = require('mongoose');
const scheduleService = require('./schedule.service');
const query = q => q.populate('userId','name phone email city locality address').populate('category','name description icon');
async function pending() { return query(Technician.find({isApproved:false}).sort({createdAt:1})); }
async function approve(id) { const t = await Technician.findById(id); if (!t) throw new Error('Technician application not found'); t.isApproved=true; t.approvedAt=new Date(); await t.save(); return query(Technician.findById(id)); }
async function reject(id) { const t=await Technician.findById(id); if(!t) throw new Error('Technician application not found'); await Technician.findByIdAndDelete(id); await User.findByIdAndUpdate(t.userId,{role:'customer'}); return {message:'Application rejected'}; }
async function stats() {
  const [customers,technicians,approved,pendingCount,bookings,completed,openComplaints,activeBookings,revenue,topServices] = await Promise.all([
    User.countDocuments({role:'customer'}),
    Technician.countDocuments(),
    Technician.countDocuments({isApproved:true}),
    Technician.countDocuments({isApproved:false}),
    Booking.countDocuments(),
    Booking.countDocuments({status:'completed'}),
    Complaint.countDocuments({status:{$in:['pending','in_review']}}),
    Booking.countDocuments({status:{$in:['pending','accepted','on_the_way','in_progress']}}),
    Booking.aggregate([{ $match:{status:'completed',paymentStatus:'succeeded'} },{ $group:{_id:null,total:{$sum:'$totalAmount'}} }]),
    Booking.aggregate([
      { $match:{status:'completed'} },
      { $group:{_id:{serviceItemId:'$serviceItemId',category:'$category'},bookings:{$sum:1},revenue:{$sum:'$totalAmount'}} },
      { $sort:{bookings:-1} },
      { $limit:5 }
    ])
  ]);
  const serviceIds=topServices.map(item=>item._id.serviceItemId).filter(Boolean);
  const categoryIds=topServices.map(item=>item._id.category).filter(Boolean);
  const [serviceRows,categoryRows]=await Promise.all([
    serviceIds.length?ServiceItem.find({_id:{$in:serviceIds}}).select('name'):[],
    categoryIds.length?Category.find({_id:{$in:categoryIds}}).select('name'):[]
  ]);
  const serviceNames=new Map(serviceRows.map(item=>[String(item._id),item.name]));
  const categoryNames=new Map(categoryRows.map(category=>[String(category._id),category.name]));
  return {
    customers,technicians,approvedTechnicians:approved,pendingTechnicians:pendingCount,
    bookings,completedBookings:completed,openComplaints,activeBookings,
    totalRevenue:revenue[0]?.total||0,
    completionRate:bookings?Math.round(completed/bookings*10000)/100:0,
    topPerformingServices:topServices.map(item=>({
      serviceItemId:item._id.serviceItemId||null,
      categoryId:item._id.category||null,
      serviceName:serviceNames.get(String(item._id.serviceItemId))
        ||categoryNames.get(String(item._id.category))
        ||'Uncategorized',
      bookings:item.bookings,
      revenue:item.revenue
    }))
  };
}
async function categories(includeInactive=false) {
  const filter=includeInactive?{}:{isActive:true};
  return Category.find(filter).sort({parentCategory:1,name:1}).populate('parentCategory','name');
}
async function people() {
  const [customers,technicians] = await Promise.all([
    User.find({role:'customer'}).select('name phone email city locality address isActive createdAt').sort({createdAt:-1}),
    Technician.find().populate('userId','name phone email city locality address isActive createdAt').populate('category','name').sort({createdAt:-1})
  ]);
  return {customers,technicians};
}
async function complaints() {
  return Complaint.find().sort({createdAt:-1})
    .populate('customerId','name phone email city locality address')
    .populate({path:'technicianId',populate:[{path:'userId',select:'name phone email city locality address'},{path:'category',select:'name'}]})
    .populate({path:'bookingId',select:'status category createdAt',populate:{path:'category',select:'name'}});
}
async function updateComplaint(id, status, adminNote) {
  const statuses=['pending','in_review','resolved','dismissed'];
  if (!statuses.includes(status)) {
    const error=new Error('Invalid complaint status'); error.statusCode=400; throw error;
  }
  const complaint=await Complaint.findById(id);
  if (!complaint) { const error=new Error('Complaint not found'); error.statusCode=404; throw error; }
  if (adminNote !== undefined) {
    if (typeof adminNote !== 'string' || adminNote.length > 1000) {
      const error=new Error('Admin note must be 1000 characters or fewer'); error.statusCode=400; throw error;
    }
    complaint.adminNote=adminNote.trim();
  }
  complaint.status=status;
  await complaint.save();
  return complaint;
}
async function setTechnicianActive(id, isActive) {
  if (typeof isActive !== 'boolean') {
    const error=new Error('isActive must be true or false'); error.statusCode=400; throw error;
  }
  const technician=await Technician.findById(id);
  if (!technician) { const error=new Error('Technician not found'); error.statusCode=404; throw error; }
  if (!isActive) {
    technician.availability=false;
    await technician.save();
  }
  const user=await User.findByIdAndUpdate(technician.userId,{isActive},{new:true,runValidators:true});
  if (!user) { const error=new Error('Technician account not found'); error.statusCode=404; throw error; }
  return query(Technician.findById(technician._id));
}

function httpError(message,statusCode) { const error=new Error(message); error.statusCode=statusCode; return error; }
function validId(id,label) { if(!mongoose.isValidObjectId(id)) throw httpError(`Invalid ${label}`,400); }

async function createCategory(data) {
  const name=typeof data.name==='string'?data.name.trim():'';
  if(!name||name.length>100) throw httpError('Category name is required and must be 100 characters or fewer',400);
  if(data.parentCategory) {
    validId(data.parentCategory,'parent category ID');
    const parent=await Category.findOne({_id:data.parentCategory,isActive:true}).select('parentCategory');
    if(!parent) throw httpError('Parent category not found',404);
    if(parent.parentCategory) throw httpError('Subcategories can only be one level deep',400);
  }
  return Category.create({name,description:data.description||'',icon:data.icon||'',parentCategory:data.parentCategory||null});
}

async function deactivateCategoryTree(id) {
  const children=await Category.find({parentCategory:id}).select('_id').lean();
  const ids=[id,...children.map(child=>child._id)];
  await Promise.all([
    Category.updateMany({parentCategory:id},{isActive:false}),
    ServiceItem.updateMany({category:{$in:ids}},{isActive:false})
  ]);
}

async function updateCategory(id,data) {
  validId(id,'category ID');
  const patch={};
  for(const key of ['name','description','icon','isActive','parentCategory']) if(data[key]!==undefined) patch[key]=data[key];
  if(patch.parentCategory) {
    validId(patch.parentCategory,'parent category ID');
    if(String(patch.parentCategory)===String(id)) throw httpError('A category cannot be its own parent',400);
    if(await Category.exists({parentCategory:id,isActive:true})) throw httpError('Move or deactivate subcategories before nesting this category',409);
    const parent=await Category.findOne({_id:patch.parentCategory,isActive:true}).select('parentCategory');
    if(!parent) throw httpError('Parent category not found',404);
    if(parent.parentCategory) throw httpError('Subcategories can only be one level deep',400);
  }
  const category=await Category.findByIdAndUpdate(id,patch,{new:true,runValidators:true});
  if(!category) throw httpError('Category not found',404);
  if(category.isActive===false) await deactivateCategoryTree(id);
  return category;
}

async function deleteCategory(id) {
  validId(id,'category ID');
  const category=await Category.findByIdAndUpdate(id,{isActive:false},{new:true});
  if(!category) throw httpError('Category not found',404);
  await deactivateCategoryTree(id);
  return {message:'Category and its catalog items deactivated'};
}

function normalizeServiceItemData(data) {
  const patch={};
  for(const key of ['category','type','name','description','price','durationMinutes','inclusions','exclusions','frequentlyAddedTogether','spareParts','isActive']) {
    if(data[key]!==undefined) patch[key]=data[key];
  }
  if(patch.name!==undefined) patch.name=String(patch.name).trim();
  if(patch.description!==undefined) patch.description=String(patch.description).trim();
  for(const key of ['inclusions','exclusions']) {
    if(patch[key]!==undefined && (!Array.isArray(patch[key]) || patch[key].some(item=>typeof item!=='string'||item.trim().length>300))) {
      throw httpError(`${key} must be an array of strings up to 300 characters`,400);
    }
    if(patch[key]) patch[key]=patch[key].map(item=>item.trim());
  }
  if(patch.spareParts!==undefined) {
    if(!Array.isArray(patch.spareParts)||patch.spareParts.some(part=>!part||typeof part!=='object')) throw httpError('Spare parts must be an array of rate card items',400);
    patch.spareParts=patch.spareParts.map(part=>({
      name:String(part.name||'').trim(),
      description:String(part.description||'').trim(),
      price:Number(part.price),
      unit:String(part.unit||'item').trim(),
      isActive:part.isActive!==false
    }));
    if(patch.spareParts.some(part=>!part.name||!Number.isFinite(part.price)||part.price<0)) {
      throw httpError('Each spare part needs a name and a valid non-negative price',400);
    }
  }
  return patch;
}

async function validateServiceItemReferences(patch,currentId) {
  if(patch.category) {
    validId(patch.category,'category ID');
    if(!await Category.exists({_id:patch.category,isActive:true})) throw httpError('Active category not found',404);
  }
  if(patch.frequentlyAddedTogether!==undefined) {
    if(!Array.isArray(patch.frequentlyAddedTogether) || patch.frequentlyAddedTogether.some(id=>!mongoose.isValidObjectId(id))) {
      throw httpError('Frequently added items must be valid service item IDs',400);
    }
    if(currentId && patch.frequentlyAddedTogether.some(id=>String(id)===String(currentId))) {
      throw httpError('A service item cannot recommend itself',400);
    }
    const count=await ServiceItem.countDocuments({_id:{$in:patch.frequentlyAddedTogether},isActive:true});
    if(count!==new Set(patch.frequentlyAddedTogether.map(String)).size) throw httpError('One or more recommended service items were not found',404);
  }
}

async function serviceItems() {
  return ServiceItem.find().sort({createdAt:-1})
    .populate('category','name parentCategory')
    .populate('frequentlyAddedTogether','name price type');
}

async function createServiceItem(data) {
  const patch=normalizeServiceItemData(data);
  await validateServiceItemReferences(patch);
  if(!patch.category||!patch.name||patch.price===undefined||patch.durationMinutes===undefined) {
    throw httpError('Category, name, fixed price, and duration are required',400);
  }
  return ServiceItem.create(patch);
}

async function updateServiceItem(id,data) {
  validId(id,'service item ID');
  const patch=normalizeServiceItemData(data);
  await validateServiceItemReferences(patch,id);
  const item=await ServiceItem.findByIdAndUpdate(id,patch,{new:true,runValidators:true});
  if(!item) throw httpError('Service item not found',404);
  return item;
}

async function deleteServiceItem(id) {
  validId(id,'service item ID');
  const item=await ServiceItem.findByIdAndUpdate(id,{isActive:false},{new:true});
  if(!item) throw httpError('Service item not found',404);
  return item;
}

async function coupons() { return Coupon.find().sort({createdAt:-1}); }
function validateCouponDates(startsAt,expiresAt) {
  const start=startsAt?new Date(startsAt):null;
  const expiry=expiresAt?new Date(expiresAt):null;
  if((start&&!Number.isFinite(start.getTime()))||(expiry&&!Number.isFinite(expiry.getTime()))) {
    throw httpError('Coupon dates must be valid dates',400);
  }
  if(start&&expiry&&start>expiry) throw httpError('Coupon expiry must be after its start date',400);
}
async function createCoupon(data) {
  validateCouponDates(data.startsAt,data.expiresAt);
  if(data.discountType==='percentage'&&Number(data.discountValue)>100) {
    throw httpError('Percentage discount cannot exceed 100',400);
  }
  return Coupon.create({
    code:data.code,
    discountType:data.discountType,
    discountValue:data.discountValue,
    minOrder:data.minOrder===undefined?0:data.minOrder,
    startsAt:data.startsAt||null,
    expiresAt:data.expiresAt||null,
    isActive:data.isActive!==false
  });
}
async function updateCoupon(id,data) {
  validId(id,'coupon ID');
  const current=await Coupon.findById(id);
  if(!current) throw httpError('Coupon not found',404);
  const patch={};
  for(const key of ['code','discountType','discountValue','minOrder','startsAt','expiresAt','isActive']) if(data[key]!==undefined) patch[key]=data[key];
  validateCouponDates(
    patch.startsAt===undefined?current.startsAt:patch.startsAt,
    patch.expiresAt===undefined?current.expiresAt:patch.expiresAt
  );
  const discountType=patch.discountType===undefined?current.discountType:patch.discountType;
  const discountValue=patch.discountValue===undefined?current.discountValue:Number(patch.discountValue);
  if(discountType==='percentage'&&discountValue>100) throw httpError('Percentage discount cannot exceed 100',400);
  const coupon=await Coupon.findByIdAndUpdate(id,patch,{new:true,runValidators:true});
  if(!coupon) throw httpError('Coupon not found',404);
  return coupon;
}
async function deleteCoupon(id) {
  validId(id,'coupon ID');
  const coupon=await Coupon.findByIdAndUpdate(id,{isActive:false},{new:true});
  if(!coupon) throw httpError('Coupon not found',404);
  return coupon;
}

async function commissionSettings() {
  const settings=await CommissionSetting.find().populate('category','name').sort({key:1});
  if(!settings.some(setting=>setting.key==='global')) {
    settings.unshift({key:'global',category:null,commissionPercent:0,platformFee:0});
  }
  return settings;
}
async function updateCommission(data) {
  const categoryId=data.category||null;
  if(categoryId) {
    validId(categoryId,'category ID');
    if(!await Category.exists({_id:categoryId,isActive:true})) throw httpError('Active category not found',404);
  }
  const commissionPercent=Number(data.commissionPercent);
  const platformFee=data.platformFee===undefined?0:Number(data.platformFee);
  if(!Number.isFinite(commissionPercent)||commissionPercent<0||commissionPercent>100
    ||!Number.isFinite(platformFee)||platformFee<0) throw httpError('Commission must be 0–100% and platform fee must be non-negative',400);
  const key=categoryId?`category:${categoryId}`:'global';
  return CommissionSetting.findOneAndUpdate(
    {key},
    {key,category:categoryId,commissionPercent,platformFee},
    {upsert:true,new:true,runValidators:true,setDefaultsOnInsert:true}
  ).populate('category','name');
}

async function bookings(filters={}) {
  const filter={};
  if(filters.status) {
    const allowed=['pending','accepted','on_the_way','in_progress','completed','cancelled'];
    if(!allowed.includes(filters.status)) throw httpError('Invalid booking status filter',400);
    filter.status=filters.status;
  }
  for(const key of ['technicianId','customerId']) {
    if(filters[key]) { validId(filters[key],key); filter[key]=filters[key]; }
  }
  if(filters.from||filters.to) {
    filter.createdAt={};
    if(filters.from) {
      const from=new Date(filters.from);
      if(Number.isNaN(from.getTime())) throw httpError('Invalid from date',400);
      filter.createdAt.$gte=from;
    }
    if(filters.to) {
      const to=new Date(filters.to);
      if(Number.isNaN(to.getTime())) throw httpError('Invalid to date',400);
      filter.createdAt.$lte=to;
    }
  }
  const page=Math.max(parseInt(filters.page,10)||1,1);
  const limit=Math.min(Math.max(parseInt(filters.limit,10)||25,1),100);
  const [items,total]=await Promise.all([
    Booking.find(filter).sort({createdAt:-1}).skip((page-1)*limit).limit(limit)
      .populate('customerId','name phone city locality')
      .populate({path:'technicianId',populate:{path:'userId',select:'name phone'}})
      .populate('category','name')
      .populate('serviceItemId','name type price'),
    Booking.countDocuments(filter)
  ]);
  return {items,pagination:{total,page,limit,pages:Math.ceil(total/limit)}};
}

async function reassignBooking(id,technicianId,adminId) {
  validId(id,'booking ID');
  validId(technicianId,'technician ID');
  const [booking,technician]=await Promise.all([
    Booking.findById(id),
    Technician.findById(technicianId)
  ]);
  if(!booking) throw httpError('Booking not found',404);
  if(!technician||!technician.isApproved||!technician.availability||!technician.isOnline) {
    throw httpError('Technician is not approved and available',400);
  }
  const [technicianUser,customer]=await Promise.all([
    User.findById(technician.userId).select('isActive city locality'),
    User.findById(booking.customerId).select('city locality')
  ]);
  if(!technicianUser?.isActive) throw httpError('Technician account is inactive',400);
  if(!customer||customer.city.trim().toLowerCase()!==technicianUser.city.trim().toLowerCase()
    ||(customer.locality&&customer.locality.trim().toLowerCase()!==(technicianUser.locality||'').trim().toLowerCase())) {
    throw httpError('Technician is outside the customer locality',400);
  }
  if(String(technician.category)!==String(booking.category)) throw httpError('Technician does not serve this booking category',400);
  if(!['pending','accepted','on_the_way'].includes(booking.status)) throw httpError('Only unstarted bookings can be reassigned',409);
  if(String(booking.technicianId||'')===String(technician._id)) throw httpError('Technician is already assigned to this booking',409);
  if(booking.paymentMethod==='online_mock'&&booking.paymentStatus!=='succeeded') throw httpError('Booking payment has not succeeded',409);
  if(booking.scheduledDate&&booking.timeSlot) {
    await scheduleService.assertTechnicianSchedule(technician,booking.scheduledDate,booking.timeSlot,booking._id);
  }
  booking.assignmentHistory.push({
    fromTechnician:booking.technicianId||null,
    toTechnician:technician._id,
    assignedBy:adminId
  });
  booking.technicianId=technician._id;
  booking.status='pending';
  booking.chatEnabledAt=null;
  try {
    await booking.save();
  } catch(error) {
    if(error.name==='VersionError') throw httpError('Booking changed concurrently; refresh and try again',409);
    throw error;
  }
  return Booking.findById(booking._id)
    .populate('customerId','name phone city locality')
    .populate({path:'technicianId',populate:{path:'userId',select:'name phone'}})
    .populate('category','name')
    .populate('serviceItemId','name type price');
}

module.exports = {
  pending, approve, reject, stats, categories, people, complaints, updateComplaint, setTechnicianActive,
  createCategory, updateCategory, deleteCategory,
  serviceItems, createServiceItem, updateServiceItem, deleteServiceItem,
  coupons, createCoupon, updateCoupon, deleteCoupon,
  commissionSettings, updateCommission, bookings, reassignBooking
};
