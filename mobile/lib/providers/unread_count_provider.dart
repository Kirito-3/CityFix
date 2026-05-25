import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'notification_center_provider.dart';

/**
 * Global reactive unread count counter provider.
 * Listens to notificationCenterProvider and counts unread items.
 */
final unreadCountProvider = Provider<int>((ref) {
  final centerState = ref.watch(notificationCenterProvider);
  return centerState.notifications.where((n) => !n.isRead).length;
});
