const { z } = require('zod');
const base = {
  name: z.string().trim().min(2).max(60),
  phone: z.string().trim().regex(/^\d{10}$/, 'Phone number must be 10 digits'),
  password: z.string().min(6).max(100),
  email: z.string().trim().email().optional().or(z.literal('')),
  city: z.string().trim().min(2).max(80),
  locality: z.string().trim().min(2).max(100),
  address: z.string().trim().max(250).optional().default(''),
  role: z.enum(['customer', 'technician']).default('customer'),
  category: z.string().optional(),
  experience: z.coerce.number().min(0).max(60).optional(),
  serviceCharge: z.coerce.number().min(0).max(1000000).optional()
};
const registerSchema = z.object(base);
const loginSchema = z.object({ phone: base.phone, password: base.password });
module.exports = { registerSchema, loginSchema };
