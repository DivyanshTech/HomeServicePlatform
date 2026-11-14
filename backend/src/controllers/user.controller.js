const service=require('../services/user.service');
exports.me=async(req,res,next)=>{try{res.json({success:true,data:await service.getMe(req.user.id)});}catch(e){next(e)}};
exports.update=async(req,res,next)=>{try{res.json({success:true,data:await service.updateMe(req.user.id,req.body),message:'Profile updated'});}catch(e){next(e)}};
