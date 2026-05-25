import 'dart:async';
import 'package:socket_io_client/socket_io_client.dart' as io_client;
import '../core/api_client.dart';

/**
 * Centrally managed Realtime Websocket Gateway Service using Socket.IO.
 * Decouples low-level socket handshakes and channel subscriptions from UI layers.
 */
class SocketService {
  SocketService._internal();
  static final SocketService instance = SocketService._internal();

  io_client.Socket? _socket;
  
  // Stream Controllers to propagate live backend messages downstream to Riverpod Notifiers
  final _statusChangeController = StreamController<Map<String, dynamic>>.broadcast();
  final _authorityAssignController = StreamController<Map<String, dynamic>>.broadcast();
  final _notificationController = StreamController<Map<String, dynamic>>.broadcast();
  final _connectionStateController = StreamController<bool>.broadcast();

  // Downstream streams that providers can listen to
  Stream<Map<String, dynamic>> get onStatusChanged => _statusChangeController.stream;
  Stream<Map<String, dynamic>> get onAuthorityAssigned => _authorityAssignController.stream;
  Stream<Map<String, dynamic>> get onNotificationReceived => _notificationController.stream;
  Stream<bool> get onConnectionStateChanged => _connectionStateController.stream;

  bool get isConnected => _socket?.connected ?? false;

  /**
   * Initializes connection with the Socket.IO gateway.
   * Leverages auth headers for secure connection handshakes.
   */
  void connect(String jwtToken) {
    if (_socket != null && _socket!.connected) return;

    // Dynamically derive backend root address by stripping the API version path
    final socketUrl = ApiClient.baseUrl.replaceAll('/api/v1', '');

    _socket = io_client.io(
      socketUrl,
      io_client.OptionBuilder()
          .setTransports(['websocket']) // Forces pure websocket transport for performance
          .enableAutoConnect()
          .enableReconnection()
          .setReconnectionDelay(3000)
          .setReconnectionAttempts(5)
          .setAuth({'token': jwtToken}) // Passes JWT token in handshake authentication
          .build(),
    );

    // Register primary connection status monitors
    _socket!.onConnect((_) {
      _connectionStateController.add(true);
    });

    _socket!.onDisconnect((_) {
      _connectionStateController.add(false);
    });

    _socket!.onConnectError((err) {
      _connectionStateController.add(false);
    });

    // Register active event handlers to route incoming websocket payloads to Dart streams
    _socket!.on('status_changed', (data) {
      if (data is Map<String, dynamic>) {
        _statusChangeController.add(data);
      }
    });

    _socket!.on('authority_assigned', (data) {
      if (data is Map<String, dynamic>) {
        _authorityAssignController.add(data);
      }
    });

    _socket!.on('notification_received', (data) {
      if (data is Map<String, dynamic>) {
        _notificationController.add(data);
      }
    });
  }

  /**
   * Instructs the Socket.IO server that this client is entering a specific complaint timeline scope.
   */
  void joinComplaintRoom(String complaintId) {
    if (_socket == null || !_socket!.connected) return;
    _socket!.emit('join_complaint_room', complaintId);
  }

  /**
   * Instructs the Socket.IO server that this client is exiting a complaint scope.
   */
  void leaveComplaintRoom(String complaintId) {
    if (_socket == null || !_socket!.connected) return;
    _socket!.emit('leave_complaint_room', complaintId);
  }

  /**
   * Subscribes the user to their private citizen channel.
   */
  void joinUserRoom(String userId) {
    if (_socket == null || !_socket!.connected) return;
    _socket!.emit('join_user_room', userId);
  }

  /**
   * Terminate active sessions and flush buffers gracefully.
   */
  void disconnect() {
    if (_socket == null) return;
    _socket!.disconnect();
    _socket!.dispose();
    _socket = null;
    _connectionStateController.add(false);
  }

  /**
   * Closes stream brokers when app terminates.
   */
  void dispose() {
    disconnect();
    _statusChangeController.close();
    _authorityAssignController.close();
    _notificationController.close();
    _connectionStateController.close();
  }
}
