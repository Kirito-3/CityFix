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
  const { title, description, category, longitude, latitude, address, images } = req.body;

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
    location,
    address,
    images: images || [],
    citizen: req.user._id,
  });

  if (!complaint) {
    throw new ApiError(500, 'Filing complaint failed. Please try again.');
  }

  // Record the initial status change in StatusLog history
  await StatusLog.create({
    complaint: complaint._id,
    changedBy: req.user._id,
    previousStatus: 'none',
    newStatus: 'reported',
    remarks: 'Complaint filed and registered successfully.',
  });

  // Emit event to Socket.IO to notify admin/authorities of new report
  const io = getIO();
  if (io) {
    io.to('admin_room').emit('new_complaint', {
      complaintId: complaint._id,
      title: complaint.title,
      category: complaint.category,
      coordinates: location.coordinates,
    });
  }

  res
    .status(201)
    .json(new ApiResponse(201, complaint, 'Complaint filed and registered successfully.'));
});

/**
 * Retrieve list of all complaints with filters (status, category, geo-proximity).
 * Route: GET /api/v1/complaints
 * Access: Private
 */
export const getComplaints = asyncHandler(async (req, res) => {
  const { status, category, lat, lng, distance = 5000 } = req.query; // distance in meters, default 5km
  const query = {};

  // Standard filters
  if (status) query.status = status;
  if (category) query.category = category;

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

  // For Citizens, only return their own complaints unless searching near coords
  if (req.user.role === 'citizen' && !(lat && lng)) {
    query.citizen = req.user._id;
  }

  const complaints = await Complaint.find(query)
    .populate('citizen', 'name email phone profilePicture')
    .populate('assignedAuthority', 'name email phone')
    .sort({ createdAt: -1 });

  res.status(200).json(new ApiResponse(200, complaints, 'Complaints list retrieved successfully.'));
});

/**
 * Retrieve individual Complaint detail with status transition history timeline.
 * Route: GET /api/v1/complaints/:id
 * Access: Private
 */
export const getComplaintById = asyncHandler(async (req, res) => {
  const complaint = await Complaint.findById(req.params.id)
    .populate('citizen', 'name email phone profilePicture')
    .populate('assignedAuthority', 'name email phone');

  if (!complaint) {
    throw new ApiError(404, 'Complaint not found.');
  }

  // Restrict Citizens from viewing other citizens' complaints
  if (req.user.role === 'citizen' && complaint.citizen._id.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'Forbidden access: You are not authorized to view this complaint.');
  }

  // Retrieve StatusLog changes history timeline
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
 * Access: Private (Admin & Authority only)
 */
export const updateComplaintStatus = asyncHandler(async (req, res) => {
  const { status, remarks } = req.body;

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
    changedBy: req.user._id,
    previousStatus,
    newStatus: status,
    remarks: remarks || `Complaint status updated from ${previousStatus} to ${status}.`,
  });

  // Create an in-app Alert Notification log for the reporting citizen
  const notification = await Notification.create({
    recipient: complaint.citizen,
    title: `Complaint Status Update`,
    message: `Your complaint regarding '${complaint.title}' has been moved to ${status.replace('_', ' ')}.`,
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

    // Notify citizens listening in their private room
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
