import Notification from '../models/Notification.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * Retrieve active alert notifications for the authenticated user session.
 * Route: GET /api/v1/notifications
 * Access: Private
 */
export const getMyNotifications = asyncHandler(async (req, res) => {
  const { unreadOnly } = req.query;
  const query = { recipient: req.user._id };

  if (unreadOnly === 'true') {
    query.isRead = false;
  }

  const notifications = await Notification.find(query).sort({ createdAt: -1 });

  res
    .status(200)
    .json(new ApiResponse(200, notifications, 'Notifications list retrieved successfully.'));
});

/**
 * Mark a specific notification document as read.
 * Route: PATCH /api/v1/notifications/:id/read
 * Access: Private
 */
export const markNotificationAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOne({
    _id: req.params.id,
    recipient: req.user._id,
  });

  if (!notification) {
    throw new ApiError(404, 'Notification alert log not found.');
  }

  notification.isRead = true;
  await notification.save();

  res
    .status(200)
    .json(new ApiResponse(200, notification, 'Notification successfully marked as read.'));
});

/**
 * Mark all pending alert notifications for current user session as read.
 * Route: PATCH /api/v1/notifications/read-all
 * Access: Private
 */
export const markAllNotificationsAsRead = asyncHandler(async (req, res) => {
  const result = await Notification.updateMany(
    { recipient: req.user._id, isRead: false },
    { $set: { isRead: true } }
  );

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { modifiedCount: result.modifiedCount },
        'All notifications marked as read successfully.'
      )
    );
});

export const registerFCMToken = asyncHandler(async (req, res) => {
  const { token } = req.body;

  const user = req.user;
  if (!user.fcmTokens) {
    user.fcmTokens = [];
  }

  // Avoid inserting duplicate tokens
  if (!user.fcmTokens.includes(token)) {
    user.fcmTokens.push(token);
    await user.save();
  }

  res
    .status(200)
    .json(new ApiResponse(200, { fcmTokens: user.fcmTokens }, 'FCM token registered successfully.'));
});

export default { 
  getMyNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead,
  registerFCMToken
};
