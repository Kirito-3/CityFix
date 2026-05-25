import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/socket_service.dart';
import '../core/secure_storage_service.dart';
import 'auth_provider.dart';

/**
 * Immutable State encapsulation for Realtime updates and websocket state
 */
class RealtimeState {
  final bool isConnected;
  final Map<String, dynamic>? lastNotification;

  RealtimeState({
    this.isConnected = false,
    this.lastNotification,
  });

  RealtimeState copyWith({
    bool? isConnected,
    Map<String, dynamic>? lastNotification,
  }) {
    return RealtimeState(
      isConnected: isConnected ?? this.isConnected,
      lastNotification: lastNotification,
    );
  }
}

/**
 * Orchestrates backend web socket connection state and global live notifications.
 */
class RealtimeNotifier extends StateNotifier<RealtimeState> {
  final Ref _ref;

  RealtimeNotifier(this._ref) : super(RealtimeState()) {
    _initSocketSync();
  }

  final SocketService _socketService = SocketService.instance;

  /**
   * Subscribes to SocketService streams and binds them to the Riverpod state.
   */
  void _initSocketSync() {
    // 1. Listen to active connection status fluctuations
    _socketService.onConnectionStateChanged.listen((connected) {
      state = state.copyWith(isConnected: connected);
    });

    // 2. Listen to user private room events (Notifications)
    _socketService.onNotificationReceived.listen((notification) {
      state = state.copyWith(lastNotification: notification);
    });

    // 3. Reactively sync connections with Auth state transitions
    _ref.listen<AuthState>(authProvider, (previous, next) async {
      final user = next.user;
      final isAuthenticated = next.isAuthenticated;

      if (isAuthenticated && user != null) {
        // Authenticated! Grab token from secure storage and fire up websocket
        final token = await SecureStorageService.instance.readToken();
        if (token != null) {
          _socketService.connect(token);
          _socketService.joinUserRoom(user.id);
        }
      } else {
        // Logged out! Shut down active connection
        _socketService.disconnect();
      }
    });
  }

  /**
   * Manual retry mechanism for connection dropouts.
   */
  Future<void> reconnect() async {
    final token = await SecureStorageService.instance.readToken();
    final user = _ref.read(authProvider).user;
    if (token != null && user != null) {
      _socketService.connect(token);
      _socketService.joinUserRoom(user.id);
    }
  }

  @override
  void dispose() {
    // SocketService singleton is kept alive, but clean up state if notifier dies
    super.dispose();
  }
}

/**
 * Global Riverpod provider exposing Socket.IO real-time capabilities
 */
final realtimeProvider = StateNotifierProvider<RealtimeNotifier, RealtimeState>((ref) {
  return RealtimeNotifier(ref);
});
