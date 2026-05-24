import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../providers/notification_provider.dart';

/**
 * Handles Firebase Cloud Messaging (FCM) push notification subscriptions, permissions, and handlers
 */
class FcmService {
  FcmService._internal();
  static final FcmService instance = FcmService._internal();

  final FirebaseMessaging _messaging = FirebaseMessaging.instance;
  bool _isInitialized = false;

  /**
   * Initializes FCM push hooks and registers active device tokens with the backend
   * 
   * @param context - BuildContext for triggering Snackbars on foreground notifications
   * @param ref - WidgetRef to execute token registration provider actions
   */
  Future<void> initialize(BuildContext context, WidgetRef ref) async {
    if (_isInitialized) return;

    try {
      // 1. Request OS native notifications delivery permissions
      NotificationSettings settings = await _messaging.requestPermission(
        alert: true,
        badge: true,
        sound: true,
        provisional: false,
      );

      if (settings.authorizationStatus == AuthorizationStatus.authorized) {
        debugPrint('FCM user successfully authorized push alerts permission.');

        // 2. Fetch unique device registration token
        final fcmToken = await _messaging.getToken();
        if (fcmToken != null) {
          debugPrint('FCM device token successfully loaded: $fcmToken');
          
          // 3. Post device token to backend registry via Riverpod
          await ref.read(notificationProvider.notifier).registerDeviceToken(fcmToken);
        }

        // 4. Set up foreground notifications overlay handlers
        FirebaseMessaging.onMessage.listen((RemoteMessage message) {
          debugPrint('FCM Foreground push notification received: ${message.notification?.title}');
          
          // Render dynamic in-app premium overlay toast banner
          if (message.notification != null) {
            _showInAppNotificationBanner(context, message);
          }
        });

        // 5. Set up background/terminated click handlers
        FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
          debugPrint('FCM Background notification clicked by user: ${message.data}');
          // In a full production application, route context GoRouter.go('/complaints/${message.data['complaintId']}')
        });

        _isInitialized = true;
      } else {
        debugPrint('FCM user rejected notification permissions.');
      }
    } catch (e) {
      debugPrint('FCM initialization encountered an error: $e');
    }
  }

  /**
   * Helper that renders in-app banner for foreground notifications
   */
  void _showInAppNotificationBanner(BuildContext context, RemoteMessage message) {
    final title = message.notification?.title ?? 'CityFix Alert';
    final body = message.notification?.body ?? 'Activity updated.';

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        behavior: SnackBarBehavior.floating,
        margin: const EdgeInsets.all(16),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        backgroundColor: Colors.indigo.shade900,
        duration: const Duration(seconds: 5),
        content: Row(
          children: [
            const Icon(Icons.notifications_active, color: Colors.amber, size: 28),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Colors.white),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    body,
                    style: const TextStyle(fontSize: 12, color: Colors.white70),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
