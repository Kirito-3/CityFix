import multer from 'multer';
import ApiError from '../utils/ApiError.js';

// 1. Configure Multer to process files purely in memory as Buffers
const storage = multer.memoryStorage();

// 2. Strict file filter accepting only specific image MIME types
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new ApiError(400, `Invalid file type [${file.mimetype}]. Only JPG, JPEG, PNG, and WEBP formats are accepted.`),
      false
    );
  }
};

// 3. Instantiate Multer options with size and filter configurations
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // Strict 5MB limit
  },
  fileFilter,
});

/**
 * Express middleware mapping multipart file uploads onto the request stream.
 * Automatically intercepts Multer size/format issues and wraps them into standard ApiError objects.
 */
export const uploadArray = (req, res, next) => {
  // Support parsing up to 5 images under the form name field 'images'
  const uploadArrayMiddleware = upload.array('images', 5);

  uploadArrayMiddleware(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(
            new ApiError(400, 'Image upload failed: One or more files exceed the maximum allowed size limit of 5MB.')
          );
        }
        return next(new ApiError(400, `Image upload failed: ${err.message}`));
      }
      // Pass other custom ApiErrors (like invalid MIME types) down the chain
      return next(err);
    }
    next();
  });
};

export default { uploadArray };
