import mongoose from 'mongoose';

const statusLogSchema = new mongoose.Schema(
  {
    complaint: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Complaint',
      required: [true, 'Log must target a specific complaint.'],
      index: true,
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Log must track the user who initiated the status change.'],
    },
    previousStatus: {
      type: String,
      enum: ['Submitted', 'Under Review', 'Assigned', 'In Progress', 'Resolved', 'Rejected', 'none'],
      default: 'none',
    },
    newStatus: {
      type: String,
      enum: ['Submitted', 'Under Review', 'Assigned', 'In Progress', 'Resolved', 'Rejected'],
      required: [true, 'New status value is required.'],
    },
    remarks: {
      type: String,
      trim: true,
      maxlength: [500, 'Remarks cannot exceed 500 characters.'],
      default: '',
    },
  },
  {
    timestamps: {
      createdAt: true, // Only track creation timestamp, since status log is append-only
      updatedAt: false,
    },
  }
);

export const StatusLog = mongoose.model('StatusLog', statusLogSchema);
export default StatusLog;
