const service=require('../services/admin.service');
exports.pending=async(req,res,next)=>{try{res.json({success:true,data:await service.pending()});}catch(e){next(e)}};
exports.approve=async(req,res,next)=>{try{res.json({success:true,data:await service.approve(req.params.id),message:'Technician approved'});}catch(e){next(e)}};
exports.reject=async(req,res,next)=>{try{res.json({success:true,data:await service.reject(req.params.id),message:'Technician rejected'});}catch(e){next(e)}};
exports.stats=async(req,res,next)=>{try{res.json({success:true,data:await service.stats()});}catch(e){next(e)}};
exports.categories=async(req,res,next)=>{try{res.json({success:true,data:await service.categories()});}catch(e){next(e)}};
