import { z } from 'zod';
import { isValidPhoneNumber } from 'libphonenumber-js';

const registerSchema = z
  .object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    firstName: z.string().min(2, 'First name must be at least 2 characters'),
    lastName: z.string().min(2, 'Last name must be at least 2 characters'),
    phoneNumber: z.string().refine((phone: string) => isValidPhoneNumber(phone), {
      message: 'Please enter a valid phone number (e.g., +1234567890, +447123456789)',
    }),
  })
  .strict();
  
const loginSchema = z
  .object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
  })
    .strict();


export { registerSchema, loginSchema };
