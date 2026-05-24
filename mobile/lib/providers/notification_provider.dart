import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/api_client.dart';

/**
 * Immutable State wrapper encapsulating Notification active flags
 */
class NotificationState {
  final bool isLoading;
  final String? errorMessage;
  final bool isTokenRegistered;

  NotificationState({
    this.isLoading = false,
    this.errorMessage,
    this.isTokenRegistered = false,
  });

  NotificationState copyWith({
    bool? isLoading,
    String? errorMessage,
    bool? isTokenRegistered,
  }) {
    return NotificationState(
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage,
      isTokenRegistered: isTokenRegistered ?? this.isTokenRegistered,
    );
  }
}

/**
 * Notifier orchestration class pushing FCM tokens to backend registry
 */
class NotificationNotifier extends StateNotifier<NotificationState> {
  NotificationNotifier() : super(NotificationState());

  final Dio _dio = ApiClient.instance.client;

  /**
   * Registers the mobile device's FCM push token with our backend.
   */
  Future<bool> registerDeviceToken(String fcmToken) async {
    state = state.copyWith(isLoading: true);
    try {
      final response = await _dio.post('/notifications/register-token', data: {
        'token': fcmToken,
      });

      if (response.statusCode == 200 && response.data['success'] == true) {
        state = NotificationState(isTokenRegistered: true);
        return true;
      } else {
        state = state.copyWith(
          errorMessage: response.data['message'] ?? 'FCM registration failed.',
          isLoading: false,
        );
        return false;
      }
    } on DioException catch (e) {
      state = state.copyWith(
        errorMessage: e.response?.data['message'] ?? 'FCM registration failed. Connection lost.',
        isLoading: false,
      );
      return false;
    } catch (e) {
      state = state.copyWith(
        errorMessage: 'An unexpected error occurred during FCM registration.',
        isLoading: false,
      );
      return false;
    }
  }
}

/**
 * Global Riverpod StateNotifierProvider wrapping notifications and FCM routing
 */
final notificationProvider = StateNotifierProvider<NotificationNotifier, NotificationState>((ref) {
  return NotificationNotifier();
});
