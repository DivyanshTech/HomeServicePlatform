const r=require('express').Router();const p=require('../middleware/auth.middleware');const role=require('../middleware/role.middleware');const c=require('../controllers/admin.controller');r.use(p,role('admin'));
r.get('/dashboard',c.stats);r.get('/people',c.people);r.get('/complaints',c.complaints);r.patch('/complaints/:id',c.updateComplaint);r.patch('/technicians/:id/active',c.setTechnicianActive);r.get('/technicians/pending',c.pending);r.patch('/technicians/:id/approve',c.approve);r.patch('/technicians/:id/reject',c.reject);
r.get('/categories',c.categories);r.post('/categories',c.createCategory);r.patch('/categories/:id',c.updateCategory);r.delete('/categories/:id',c.deleteCategory);
r.get('/service-items',c.serviceItems);r.post('/service-items',c.createServiceItem);r.patch('/service-items/:id',c.updateServiceItem);r.delete('/service-items/:id',c.deleteServiceItem);
r.get('/coupons',c.coupons);r.post('/coupons',c.createCoupon);r.patch('/coupons/:id',c.updateCoupon);r.delete('/coupons/:id',c.deleteCoupon);
r.get('/commission',c.commissionSettings);r.put('/commission',c.updateCommission);
r.get('/bookings',c.bookings);r.patch('/bookings/:id/reassign',c.reassignBooking);module.exports=r;
