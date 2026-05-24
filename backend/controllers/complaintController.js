import Complaint from '../models/Complaint.js';
import StatusLog from '../models/StatusLog.js';
import Notification from '../models/Notification.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import { getIO } from '../sockets/index.js';

/**
 * File a new Civic Issue Complaint.
 * Route: POST /api/v1/complaints
 * Access: Private (Citizen only)
 */
export const createComplaint = asyncHandler(async (req, res) => {
  const { title, description, category, priority, longitude, latitude, address, images } = req.body;

  // Format GeoJSON structure
  const location = {
    type: 'Point',
    coordinates: [longitude, latitude], // Note: longitude first, then latitude in GeoJSON
  };

  // Create Complaint document
  const complaint = await Complaint.create({
    title,
    description,
    category,
    priority: priority || 'medium',
    location,
    address,
    images: images || [],
    citizen: req.user._id,
    status: 'Submitted', // Auto-assign default status = "Submitted"
  });

  if (!complaint) {
    throw new ApiError(500, 'Filing complaint failed. Please try again.');
  }

  // Record the initial status change in StatusLog history
  await StatusLog.create({
    complaint: complaint._id,
    changedBy: req.user._id,
    previousStatus: 'none',
    newStatus: 'Submitted',
    remarks: 'Complaint filed and registered successfully.',
  });

  // Emit event to Socket.IO to notify admin/authorities of new report
  const io = getIO();
  if (io) {
    io.to('admin_room').emit('new_complaint', {
      complaintId: complaint._id,
      title: complaint.title,
      category: complaint.category,
      priority: complaint.priority,
      coordinates: location.coordinates,
    });
  }

  res
    .status(201)
    .json(new ApiResponse(201, complaint, 'Complaint filed and registered successfully.'));
});

/**
 * Retrieve list of all complaints with filters (status, category, priority, geo-proximity) and pagination.
 * Route: GET /api/v1/complaints
 * Access: Private
 */
export const getComplaints = asyncHandler(async (req, res) => {
  const { status, category, priority, page = 1, limit = 10, lat, lng, distance = 5000 } = req.query;
  const query = {};

  // Apply filters
  if (status) query.status = status;
  if (category) query.category = category;
  if (priority) query.priority = priority;

  // Geospatial filtering (Radius-based querying via 2dsphere index)
  if (lat && lng) {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      throw new ApiError(400, 'Geospatial coordinates (lat, lng) must be valid numbers.');
    }

    query.location = {
      $nearSphere: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude],
        },
        $maxDistance: parseInt(distance, 10),
      },
    };
  }

  // Role restriction: Citizens see only their own complaints unless a geospatial proximity query is triggered
  if (req.user.role === 'citizen' && !(lat && lng)) {
    query.citizen = req.user._id;
  }

  // Calculate pagination parameters
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 10;
  const skip = (pageNum - 1) * limitNum;

  // Query database counts
  const totalCount = await Complaint.countDocuments(query);

  const complaints = await Complaint.find(query)
    .populate('citizen', 'name email phone profilePicture role')
    .populate('assignedAuthority', 'name email phone')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        complaints,
        pagination: {
          totalCount,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(totalCount / limitNum),
        },
      },
      'Complaints list retrieved successfully.'
    )
  );
});

/**
 * Retrieve individual Complaint detail with status transition history timeline and reporter details.
 * Route: GET /api/v1/complaints/:id
 * Access: Private
 */
export const getComplaintById = asyncHandler(async (req, res) => {
  const complaint = await Complaint.findById(req.params.id)
    .populate('citizen', 'name email phone profilePicture role')
    .populate('assignedAuthority', 'name email phone');

  if (!complaint) {
    throw new ApiError(404, 'Complaint not found.');
  }

  // Restrict Citizens from viewing other citizens' complaints
  if (req.user.role === 'citizen' && complaint.citizen._id.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Forbidden access: You are not authorized to view this complaint.');
  }

  // Retrieve StatusLog changes history timeline populated with admin details
  const timeline = await StatusLog.find({ complaint: complaint._id })
    .populate('changedBy', 'name role')
    .sort({ createdAt: 1 });

  res.status(200).json(
    new ApiResponse(
      200,
      { complaint, timeline },
      'Complaint details and history timeline retrieved.'
    )
  );
});

/**
 * Update Complaint status and document transition in timeline history.
 * Route: PATCH /api/v1/complaints/:id/status
 * Access: Private (Admin strictly)
 */
export const updateComplaintStatus = asyncHandler(async (req, res) => {
  const { status, remarks } = req.body;

  // STRICT PROTECTION: Enforce that only admins can update status
  if (req.user.role !== 'admin') {
    throw new ApiError(403, 'Access forbidden: Only administrators can update complaint statuses.');
  }

  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) {
    throw new ApiError(404, 'Complaint not found.');
  }

  const previousStatus = complaint.status;
  if (previousStatus === status) {
    throw new ApiError(400, `Complaint status is already in state '${status}'.`);
  }

  // Update status
  complaint.status = status;
  await complaint.save();

  // Record status transition in timeline statuslog collection
  const log = await StatusLog.create({
    complaint: complaint._id,
    changedBy: req.user._id, // admin ID
    previousStatus,
    newStatus: status,
    remarks: remarks || `Complaint status updated from ${previousStatus} to ${status}.`,
  });

  // Create an in-app Alert Notification log for the reporting citizen
  const notification = await Notification.create({
    recipient: complaint.citizen,
    title: `Complaint Status Update`,
    message: `Your complaint regarding '${complaint.title}' has been moved to ${status}.`,
    type: 'complaint_status',
  });

  // Emit websocket events for realtime mobile client / admin board sync
  const io = getIO();
  if (io) {
    // Notify complaint detail view listeners
    io.to(`complaint_${complaint._id}`).emit('status_changed', {
      complaintId: complaint._id,
      previousStatus,
      newStatus: status,
      remarks: log.remarks,
      updatedAt: log.createdAt,
    });

    // Notify admin dashboard listeners
    io.to('admin_room').emit('complaint_status_updated', {
      complaintId: complaint._id,
      previousStatus,
      newStatus: status,
      remarks: log.remarks,
      updatedAt: log.createdAt,
    });

    // Notify citizens private room
    io.to(`user_${complaint.citizen}`).emit('notification_received', {
      id: notification._id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      createdAt: notification.createdAt,
    });
  }

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { complaint, log },
        `Complaint status updated to '${status}' successfully.`
      )
    );
});

export default { createComplaint, getComplaints, getComplaintById, updateComplaintStatus };
