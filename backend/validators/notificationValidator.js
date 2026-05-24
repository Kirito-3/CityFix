import { z } from 'zod';

/**
 * Zod validation schema for registering a device FCM token
 */
export const registerTokenSchema = z.object({
  token: z
    .string({ required_error: 'FCM device token is required' })
    .min(5, { message: 'FCM token must be at least 5 characters long' })
    .trim(),
});

export default { registerTokenSchema };
