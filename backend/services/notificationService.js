import { admin, isFirebaseEnabled } from '../config/firebase.js';
import User from '../models/User.js';
import logger from '../utils/logger.js';

/**
 * Sends a multicast push notification to a list of target FCM tokens.
 * Automatically identifies delivery failures due to expired/invalid tokens 
 * and prunes them from the database globally.
 * 
 * @param {string|null} userId - ID of the target recipient user (optional, for logging context)
 * @param {string[]} tokens - Array of target FCM device tokens
 * @param {Object} payload - Push notification content
 * @param {string} payload.title - Notification title
 * @param {string} payload.body - Notification description body
 * @param {string} [payload.type='general'] - Type category (e.g. 'complaint_status')
 * @param {string} [payload.complaintId=''] - Linked complaint record database ID
 */
export const sendPushNotification = async (userId, tokens, payload) => {
  if (!tokens || tokens.length === 0) {
    return;
  }

  // Failsafe Mock Fallback Mode
  if (!isFirebaseEnabled) {
    logger.info(
      `[MOCK FCM PUSH] Sent to ${userId ? `User [${userId}]` : 'Bulk Receivers'} | Tokens Count: ${tokens.length} | Title: "${payload.title}" | Body: "${payload.body}" | Type: "${payload.type || 'general'}"`
    );
    return;
  }

  try {
    // Structure FCM payload
    const message = {
      tokens,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: {
        type: payload.type || 'general',
        complaintId: payload.complaintId ? payload.complaintId.toString() : '',
      },
    };

    // Trigger Firebase multicast sending (returns response results mapping index-to-token)
    const response = await admin.messaging().sendEachForMulticast(message);
    
    const tokensToRemove = [];

    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        const errorCode = resp.error?.code;
        logger.error(`FCM token delivery failed for token [${tokens[idx].substring(0, 15)}...]:`, resp.error);

        // Identify expired or invalid tokens
        if (
          errorCode === 'messaging/invalid-registration-token' ||
          errorCode === 'messaging/registration-token-not-registered'
        ) {
          tokensToRemove.push(tokens[idx]);
        }
      }
    });

    // Prune invalid tokens globally from MongoDB to maintain active-only collections
    if (tokensToRemove.length > 0) {
      logger.info(`Pruning ${tokensToRemove.length} expired or unregistered FCM tokens globally...`);
      await User.updateMany(
        { fcmTokens: { $in: tokensToRemove } },
        { $pull: { fcmTokens: { $in: tokensToRemove } } }
      );
    }
  } catch (error) {
    logger.error('Multicast push notification delivery thread encountered an error:', error);
  }
};

/**
 * Constructs and fires push notifications to a citizen reporting an issue when their status shifts.
 * 
 * @param {Object} complaint - Mongoose Complaint document
 * @param {string} previousStatus - State before change
 * @param {string} newStatus - Current state
 */
export const sendComplaintStatusNotification = async (complaint, previousStatus, newStatus) => {
  try {
    const citizenId = complaint.citizen._id || complaint.citizen;
    
    // Fetch citizen's user account to retrieve device tokens
    const citizen = await User.findById(citizenId).select('fcmTokens');
    if (!citizen || !citizen.fcmTokens || citizen.fcmTokens.length === 0) {
      return;
    }

    const payload = {
      title: 'Complaint Status Update',
      body: `Your complaint regarding '${complaint.title}' has been moved to ${newStatus}.`,
      type: 'complaint_status',
      complaintId: complaint._id.toString(),
    };

    await sendPushNotification(citizen._id.toString(), citizen.fcmTokens, payload);
  } catch (error) {
    logger.error(`Failed to trigger complaint status notification for complaint [${complaint._id}]:`, error);
  }
};

/**
 * Placeholder broadcast service to send bulk alerts to administrative roles.
 * 
 * @param {Object} payload - Notification body payload
 */
export const sendBulkAdminNotification = async (payload) => {
  try {
    // Fetch all admins globally
    const admins = await User.find({ role: 'admin' }).select('fcmTokens');
    const adminTokens = admins.flatMap((admin) => admin.fcmTokens || []);

    if (adminTokens.length === 0) {
      return;
    }

    logger.info(`Broadcasting bulk push notifications to ${adminTokens.length} Admin devices...`);
    await sendPushNotification(null, adminTokens, payload);
  } catch (error) {
    logger.error('Failed to trigger bulk administrative push notification:', error);
  }
};

export default { sendPushNotification, sendComplaintStatusNotification, sendBulkAdminNotification };
