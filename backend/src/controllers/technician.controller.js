const service=require('../services/technician.service');
exports.register=async(req,res,next)=>{try{res.status(201).json({success:true,data:await service.registerTechnician(req.user.id,req.body),message:'Application submitted for admin approval'});}catch(e){next(e)}};
exports.list=async(req,res,next)=>{try{const r=await service.listApprovedForCustomer(req.user.id,req.query);res.json({success:true,data:r.list,pagination:r.pagination});}catch(e){next(e)}};
exports.get=async(req,res,next)=>{try{res.json({success:true,data:await service.getById(req.params.id)});}catch(e){next(e)}};
exports.profile=async(req,res,next)=>{try{res.json({success:true,data:await service.getProfileByUserId(req.user.id)});}catch(e){next(e)}};
exports.update=async(req,res,next)=>{try{res.json({success:true,data:await service.updateProfile(req.user.id,req.body),message:'Technician profile updated'});}catch(e){next(e)}};
exports.earnings=async(req,res,next)=>{try{res.json({success:true,data:await service.earningsSummary(req.user.id)});}catch(e){next(e)}};
