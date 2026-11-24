const service=require('../services/category.service');
exports.list=async(req,res,next)=>{try{res.json({success:true,data:await service.list()});}catch(e){next(e)}};
