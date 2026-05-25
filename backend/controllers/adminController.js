import Complaint from '../models/Complaint.js';
import User from '../models/User.js';
import StatusLog from '../models/StatusLog.js';
import Notification from '../models/Notification.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import { getIO } from '../sockets/index.js';

/**
 * Fetch overview statistics for the admin dashboard dashboard.
 * Route: GET /api/v1/admin/stats
 * Access: Private (Admin only)
 */
export const getDashboardStats = asyncHandler(async (req, res) => {
  // Aggregate core document counts
  const totalUsers = await User.countDocuments();
  const totalCitizens = await User.countDocuments({ role: 'citizen' });
  const totalAuthorities = await User.countDocuments({ role: 'authority' });

  const totalComplaints = await Complaint.countDocuments();

  // NOTE: Status values must match exact strings stored by complaintController.js
  // ('Submitted', 'Under Review', 'Assigned', 'In Progress', 'Resolved', 'Rejected')
  const submittedComplaints = await Complaint.countDocuments({ status: 'Submitted' });
  const underReviewComplaints = await Complaint.countDocuments({ status: 'Under Review' });
  const assignedComplaints = await Complaint.countDocuments({ status: 'Assigned' });
  const inProgressComplaints = await Complaint.countDocuments({ status: 'In Progress' });
  const resolvedComplaints = await Complaint.countDocuments({ status: 'Resolved' });
  const rejectedComplaints = await Complaint.countDocuments({ status: 'Rejected' });

  // Group complaints by category using MongoDB aggregations
  const categoryStats = await Complaint.aggregate([
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
      },
    },
    {
      $project: {
        category: '$_id',
        count: 1,
        _id: 0,
      },
    },
  ]);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        users: {
          total: totalUsers,
          citizens: totalCitizens,
          authorities: totalAuthorities,
        },
        complaints: {
          total: totalComplaints,
          reported: submittedComplaints,
          underReview: underReviewComplaints,
          assigned: assignedComplaints,
          inProgress: inProgressComplaints,
          resolved: resolvedComplaints,
          rejected: rejectedComplaints,
        },
        categories: categoryStats,
      },
      'Dashboard aggregate stats compiled successfully.'
    )
  );
});

/**
 * Assign an issue to a designated department authority for remediation.
 * Route: PATCH /api/v1/admin/complaints/:id/assign
 * Access: Private (Admin only)
 */
export const assignComplaintAuthority = asyncHandler(async (req, res) => {
  const { authorityId } = req.body;
  const complaintId = req.params.id;

  if (!authorityId) {
    throw new ApiError(400, 'Authority ID is required for assignment.');
  }

  // Validate targeted authority user exists and holds role 'authority'
  const authorityUser = await User.findById(authorityId);
  if (!authorityUser || authorityUser.role !== 'authority') {
    throw new ApiError(400, 'Invalid authority: Targeted user is not a registered department authority.');
  }

  // Find targeted complaint
  const complaint = await Complaint.findById(complaintId);
  if (!complaint) {
    throw new ApiError(404, 'Targeted complaint not found.');
  }

  // Update assignment properties
  complaint.assignedAuthority = authorityId;
  
  // Transition complaint into 'under_review' status automatically upon assignment
  const originalStatus = complaint.status;
  complaint.status = 'under_review';
  await complaint.save();

  // Log transition in history StatusLog collection
  const log = await StatusLog.create({
    complaint: complaint._id,
    changedBy: req.user._id,
    previousStatus: originalStatus,
    newStatus: 'under_review',
    remarks: `Complaint assigned to authority department officer: ${authorityUser.name}.`,
  });

  // Notify citizen that department is reviewing the issue
  const citizenNotification = await Notification.create({
    recipient: complaint.citizen,
    title: 'Complaint Under Review',
    message: `Your issue regarding '${complaint.title}' has been assigned to department officer ${authorityUser.name}.`,
    type: 'assignment',
  });

  // Notify assigned department officer
  const authorityNotification = await Notification.create({
    recipient: authorityId,
    title: 'New Complaint Assigned',
    message: `You have been assigned to review and resolve the complaint: '${complaint.title}' at ${complaint.address}.`,
    type: 'assignment',
  });

  // Emit websocket events for realtime syncing
  const io = getIO();
  if (io) {
    // Notify complaint detailed logs listeners
    io.to(`complaint_${complaint._id}`).emit('authority_assigned', {
      complaintId: complaint._id,
      authority: {
        id: authorityUser._id,
        name: authorityUser.name,
      },
      status: 'under_review',
      remarks: log.remarks,
    });

    // Notify citizens private room
    io.to(`user_${complaint.citizen}`).emit('notification_received', {
      id: citizenNotification._id,
      title: citizenNotification.title,
      message: citizenNotification.message,
      type: citizenNotification.type,
      createdAt: citizenNotification.createdAt,
    });

    // Notify authority officer private room
    io.to(`user_${authorityUser._id}`).emit('notification_received', {
      id: authorityNotification._id,
      title: authorityNotification.title,
      message: authorityNotification.message,
      type: authorityNotification.type,
      createdAt: authorityNotification.createdAt,
    });
  }

  res.status(200).json(
    new ApiResponse(
      200,
      { complaint, log },
      `Complaint successfully assigned to department officer ${authorityUser.name}.`
    )
  );
});

/**
 * Retrieve registered department authorities directory.
 * Route: GET /api/v1/admin/authorities
 * Access: Private (Admin and Authority only)
 */
export const getAuthorities = asyncHandler(async (req, res) => {
  const authorities = await User.find({ role: 'authority' }).select('name email phone profilePicture role');
  res.status(200).json(
    new ApiResponse(
      200,
      authorities,
      'Department authorities list retrieved successfully.'
    )
  );
});

export default { getDashboardStats, assignComplaintAuthority, getAuthorities };
