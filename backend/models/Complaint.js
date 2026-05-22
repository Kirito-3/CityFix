import mongoose from 'mongoose';

const complaintSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a complaint title.'],
      trim: true,
      maxlength: [100, 'Complaint title cannot exceed 100 characters.'],
    },
    description: {
      type: String,
      required: [true, 'Please provide a detailed description.'],
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters.'],
    },
    category: {
      type: String,
      required: [true, 'Please choose a category.'],
      enum: ['pothole', 'garbage', 'drainage', 'water_leakage', 'streetlight', 'other'],
    },
    status: {
      type: String,
      enum: ['reported', 'under_review', 'resolved'],
      default: 'reported',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    // GeoJSON Point location schema for spatial queries
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
        required: true,
      },
      coordinates: {
        type: [Number], // Format: [longitude, latitude]
        required: [true, 'Coordinates are required for geolocation.'],
      },
    },
    address: {
      type: String,
      required: [true, 'Please provide an approximate location address.'],
      trim: true,
    },
    citizen: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Every complaint must be associated with a reporting citizen.'],
    },
    assignedAuthority: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    images: [
      {
        type: String, // Cloudinary URLs
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Apply a 2dsphere index on the location object to allow geospatial queries
complaintSchema.index({ location: '2dsphere' });

export const Complaint = mongoose.model('Complaint', complaintSchema);
export default Complaint;
