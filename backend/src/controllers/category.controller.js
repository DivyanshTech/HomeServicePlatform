const Category=require('../models/Category');
exports.list=async(req,res,next)=>{try{res.json({success:true,data:await Category.find({isActive:true}).sort({name:1})});}catch(e){next(e)}};
