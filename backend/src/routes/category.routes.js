const r=require('express').Router();const c=require('../controllers/category.controller');r.get('/',c.list);module.exports=r;
