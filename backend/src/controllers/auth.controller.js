const service=require('../services/auth.service');
exports.register=async(req,res,next)=>{try{res.status(201).json({success:true,data:await service.registerUser(req.body),message:'Registration successful'});}catch(e){next(e)}};
exports.login=async(req,res,next)=>{try{res.json({success:true,data:await service.loginUser(req.body),message:'Login successful'});}catch(e){next(e)}};
