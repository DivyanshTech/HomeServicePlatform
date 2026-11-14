const router=require('express').Router();const c=require('../controllers/auth.controller');const validate=require('../middleware/validate.middleware');const {registerSchema,loginSchema}=require('../validators/auth.validator');
router.post('/register',validate(registerSchema),c.register);router.post('/login',validate(loginSchema),c.login);module.exports=router;
