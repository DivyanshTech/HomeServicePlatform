const r=require('express').Router();const p=require('../middleware/auth.middleware');const c=require('../controllers/user.controller');r.get('/me',p,c.me);r.patch('/me',p,c.update);module.exports=r;
