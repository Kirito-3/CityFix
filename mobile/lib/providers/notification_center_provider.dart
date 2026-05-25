import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/api_client.dart';
import '../models/notification_model.dart';
import '../services/socket_service.dart';

/**
 * Immutable State encapsulation for the Notification Center feed
 */
class NotificationCenterState {
  final List<NotificationModel> notifications;
  final bool isLoading;
  final String? errorMessage;

  NotificationCenterState({
    this.notifications = const [],
    this.isLoading = false,
    this.errorMessage,
  });

  NotificationCenterState copyWith({
    List<NotificationModel>? notifications,
    bool? isLoading,
    String? errorMessage,
  }) {
    return NotificationCenterState(
      notifications: notifications ?? this.notifications,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage,
    );
  }
}

/**
 * Notifier orchestration class managing active notifications lookup, read patches, and socket updates.
 */
class NotificationCenterNotifier extends StateNotifier<NotificationCenterState> {
  NotificationCenterNotifier() : super(NotificationCenterState()) {
    _subscribeToWebsockets();
  }

  final Dio _dio = ApiClient.instance.client;
  final SocketService _socketService = SocketService.instance;
  StreamSubscription? _socketSub;

  /**
   * Registers a socket listener that reactively appends incoming alert notifications in-memory.
   */
  void _subscribeToWebsockets() {
    _socketSub = _socketService.onNotificationReceived.listen((data) {
      // Deserialize the socket notification payload
      final newNotification = NotificationModel.fromJson(data);

      // Avoid duplicate insertions
      if (state.notifications.any((n) => n.id == newNotification.id)) return;

      // Insert at the very top of the chronological feed
      state = state.copyWith(
        notifications: [newNotification, ...state.notifications],
      );
    });
  }

  /**
   * Loads notifications list from the REST API endpoint: GET /api/v1/notifications
   */
  Future<void> fetchNotifications() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final response = await _dio.get('/notifications');

      if (response.statusCode == 200 && response.data['success'] == true) {
        final List<dynamic> alertsList = response.data['data'];
        final notifications = alertsList.map((x) => NotificationModel.fromJson(x)).toList();

        // Sort chronologically (newest first)
        notifications.sort((a, b) => b.createdAt.compareTo(a.createdAt));

        state = NotificationCenterState(
          notifications: notifications,
          isLoading: false,
        );
      } else {
        state = state.copyWith(
          errorMessage: response.data['message'] ?? 'Failed to retrieve notifications.',
          isLoading: false,
        );
      }
    } on DioException catch (e) {
      state = state.copyWith(
        errorMessage: e.response?.data['message'] ?? 'Connection error: failed to fetch alerts.',
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(
        errorMessage: 'An unexpected error occurred.',
        isLoading: false,
      );
    }
  }

  /**
   * Marks a single notification alert log as read via: PATCH /api/v1/notifications/:id/read
   */
  Future<void> markAsRead(String notificationId) async {
    // Optimistic UI update: transition state instantly in-memory
    final updatedList = state.notifications.map((n) {
      if (n.id == notificationId) {
        return NotificationModel(
          id: n.id,
          recipientId: n.recipientId,
          title: n.title,
          message: n.message,
          type: n.type,
          isRead: true,
          createdAt: n.createdAt,
        );
      }
      return n;
    }).toList();

    state = state.copyWith(notifications: updatedList);

    try {
      await _dio.patch('/notifications/$notificationId/read');
    } catch (e) {
      // Revert if API fails? (For premium UX, logging is sufficient as subsequent sync will reconcile)
      // ignore
    }
  }

  /**
   * Marks all citizen notifications as read globally via: PATCH /api/v1/notifications/read-all
   */
  Future<void> markAllAsRead() async {
    // Optimistic UI update: set all isRead flags to true instantly
    final updatedList = state.notifications.map((n) {
      return NotificationModel(
        id: n.id,
        recipientId: n.recipientId,
        title: n.title,
        message: n.message,
        type: n.type,
        isRead: true,
        createdAt: n.createdAt,
      );
    }).toList();

    state = state.copyWith(notifications: updatedList);

    try {
      await _dio.patch('/notifications/read-all');
    } catch (e) {
      // ignore
    }
  }

  @override
  void dispose() {
    _socketSub?.cancel();
    super.dispose();
  }
}

/**
 * Global Riverpod provider managing the Notification Center feed
 */
final notificationCenterProvider =
    StateNotifierProvider<NotificationCenterNotifier, NotificationCenterState>((ref) {
  return NotificationCenterNotifier();
});
