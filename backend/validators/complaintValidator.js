import { z } from 'zod';

/**
 * Zod validation schema for creating a new complaint.
 */
export const createComplaintSchema = z.object({
  title: z
    .string({ required_error: 'Complaint title is required' })
    .min(5, { message: 'Title must be at least 5 characters long' })
    .max(100, { message: 'Title cannot exceed 100 characters' })
    .trim(),
  description: z
    .string({ required_error: 'Complaint description is required' })
    .min(10, { message: 'Description must be at least 10 characters long' })
    .max(1000, { message: 'Description cannot exceed 1000 characters' })
    .trim(),
  category: z.enum(['pothole', 'garbage', 'drainage', 'water_leakage', 'streetlight', 'other'], {
    message: 'Category must be one of: pothole, garbage, drainage, water_leakage, streetlight, other',
  }),
  longitude: z
    .number({ required_error: 'Longitude coordinate is required' })
    .min(-180, { message: 'Longitude must be between -180 and 180' })
    .max(180, { message: 'Longitude must be between -180 and 180' }),
  latitude: z
    .number({ required_error: 'Latitude coordinate is required' })
    .min(-90, { message: 'Latitude must be between -90 and 90' })
    .max(90, { message: 'Latitude must be between -90 and 90' }),
  address: z
    .string({ required_error: 'Approximate address is required' })
    .min(3, { message: 'Address must be at least 3 characters long' })
    .trim(),
  images: z.array(z.string().url({ message: 'Each image must be a valid URL' })).optional(),
});

/**
 * Zod validation schema for updating a complaint status (primarily for authority/admin).
 */
export const updateComplaintStatusSchema = z.object({
  status: z.enum(['reported', 'under_review', 'resolved'], {
    message: 'Status must be one of: reported, under_review, resolved',
  }),
  remarks: z
    .string()
    .max(500, { message: 'Remarks cannot exceed 500 characters' })
    .optional()
    .default(''),
});

export default { createComplaintSchema, updateComplaintStatusSchema };
