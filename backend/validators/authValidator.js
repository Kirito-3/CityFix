import { z } from 'zod';

/**
 * Zod validation schema for user registration (signup) payload.
 */
export const signupSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .min(2, { message: 'Name must be at least 2 characters long' })
    .max(50, { message: 'Name cannot exceed 50 characters' })
    .trim(),
  email: z
    .string({ required_error: 'Email is required' })
    .email({ message: 'Please enter a valid email address' })
    .toLowerCase()
    .trim(),
  password: z
    .string({ required_error: 'Password is required' })
    .min(6, { message: 'Password must be at least 6 characters long' }),
  role: z
    .enum(['citizen', 'authority', 'admin'], {
      message: 'Role must be either citizen, authority, or admin',
    })
    .optional(),
  phone: z
    .string()
    .min(10, { message: 'Phone number must be at least 10 characters long' })
    .optional(),
});

/**
 * Zod validation schema for user login payload.
 */
export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email({ message: 'Please enter a valid email address' })
    .toLowerCase()
    .trim(),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, { message: 'Password is required' }),
});

export default { signupSchema, loginSchema };
