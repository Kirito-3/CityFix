import { Readable } from 'stream';
import cloudinary from '../config/cloudinary.js';
import logger from '../utils/logger.js';

/**
 * Uploads a file buffer directly to Cloudinary using native streams.
 * 
 * @param {Buffer} buffer - File buffer from Multer memoryStorage
 * @param {string} [folder='cityfix/complaints'] - Target Cloudinary folder path
 * @returns {Promise<Object>} Cloudinary API success result containing secure_url, public_id, etc.
 */
export const uploadImageBuffer = (buffer, folder = 'cityfix/complaints') => {
  return new Promise((resolve, reject) => {
    if (!buffer) {
      return reject(new Error('Upload failed: File buffer is empty or missing.'));
    }

    // Configure automatic optimizations: auto-quality and auto-format (webp/png conversion)
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        transformation: [
          { quality: 'auto:good', fetch_format: 'auto' }
        ]
      },
      (error, result) => {
        if (error) {
          logger.error('Cloudinary upload stream failed:', error);
          return reject(error);
        }
        resolve(result);
      }
    );

    // Stream the raw buffer directly to Cloudinary
    Readable.from(buffer).pipe(uploadStream);
  });
};

/**
 * Deletes an asset from Cloudinary using its unique Public ID.
 * Helper placeholder for updating or removing complaint media assets.
 * 
 * @param {string} publicId - Unique Public ID of the asset on Cloudinary
 * @returns {Promise<Object>} Cloudinary deletion result
 */
export const deleteImage = async (publicId) => {
  try {
    if (!publicId) {
      throw new Error('Deletion failed: Public ID is required.');
    }
    const result = await cloudinary.uploader.destroy(publicId);
    logger.info(`Asset successfully deleted from Cloudinary: ${publicId}`);
    return result;
  } catch (error) {
    logger.error(`Cloudinary asset deletion failed for publicId [${publicId}]:`, error);
    throw error;
  }
};

export default { uploadImageBuffer, deleteImage };
