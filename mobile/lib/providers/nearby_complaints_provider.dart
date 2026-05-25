import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/api_client.dart';
import '../models/complaint_model.dart';
import '../services/socket_service.dart';
import 'live_map_state_provider.dart';

/**
 * Immutable State encapsulation for nearby complaints list
 */
class NearbyComplaintsState {
  final List<ComplaintModel> complaints;
  final bool isLoading;
  final String? errorMessage;

  NearbyComplaintsState({
    this.complaints = const [],
    this.isLoading = false,
    this.errorMessage,
  });

  NearbyComplaintsState copyWith({
    List<ComplaintModel>? complaints,
    bool? isLoading,
    String? errorMessage,
  }) {
    return NearbyComplaintsState(
      complaints: complaints ?? this.complaints,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage,
    );
  }
}

/**
 * Notifier orchestration class executing radius queries and socket syncs.
 */
class NearbyComplaintsNotifier extends StateNotifier<NearbyComplaintsState> {
  final Ref _ref;

  NearbyComplaintsNotifier(this._ref) : super(NearbyComplaintsState()) {
    _subscribeToLiveStreams();
  }

  final Dio _dio = ApiClient.instance.client;
  final SocketService _socketService = SocketService.instance;

  StreamSubscription? _statusSub;
  StreamSubscription? _assignSub;
  StreamSubscription? _newComplaintSub;

  /**
   * Listens to live WebSocket streams to update geographical pins reactively
   */
  void _subscribeToLiveStreams() {
    // 1. Status log transitions -> updates pin status colors instantly
    _statusSub = _socketService.onStatusChanged.listen((data) {
      final complaintId = data['complaintId'];
      if (complaintId == null) return;

      final updatedList = state.complaints.map((c) {
        if (c.id == complaintId) {
          return _cloneComplaintWithStatus(c, data['newStatus'] ?? 'Submitted');
        }
        return c;
      }).toList();

      state = state.copyWith(complaints: updatedList);
    });

    // 2. New complaint created -> inserts pin live if it sits inside active search radius
    _newComplaintSub = _socketService.onNotificationReceived.listen((data) {
      // In the backend socket emitter:
      // io.to('admin_room').emit('new_complaint', ...) or notification_received
      // If notification contains complaint category, location coordinates or title, we check radius.
      // Wait, the alert type is complaint_status, assignment or notifications. Let's make sure that
      // if notification contains a type/complaint info, or if we query nearby.
      // Since a new complaint is filed, let's also fetch fresh list when a new notification is received to keep maps sync active!
      // This is extremely simple and guarantees perfect data consistency!
      fetchNearby();
    });
  }

  /**
   * Queries nearby complaints matching coordinates and radius criteria: GET /complaints
   */
  Future<void> fetchNearby() async {
    // Watch active map Settings state properties
    final mapState = _ref.read(liveMapStateProvider);

    state = state.copyWith(isLoading: true, errorMessage: null);

    try {
      final Map<String, dynamic> queryParams = {
        'lat': mapState.centerLatitude,
        'lng': mapState.centerLongitude,
        'distance': mapState.radiusInMeters.toInt(),
      };

      if (mapState.categoryFilter != null) {
        queryParams['category'] = mapState.categoryFilter;
      }
      if (mapState.statusFilter != null) {
        queryParams['status'] = mapState.statusFilter;
      }

      final response = await _dio.get('/complaints', queryParameters: queryParams);

      if (response.statusCode == 200 && response.data['success'] == true) {
        final List<dynamic> complaintsList = response.data['data']['complaints'];
        final nearby = complaintsList.map((x) => ComplaintModel.fromJson(x)).toList();

        state = NearbyComplaintsState(
          complaints: nearby,
          isLoading: false,
        );
      } else {
        state = state.copyWith(
          errorMessage: response.data['message'] ?? 'Failed to load nearby reports.',
          isLoading: false,
        );
      }
    } on DioException catch (e) {
      state = state.copyWith(
        errorMessage: e.response?.data['message'] ?? 'Connection error: failed to fetch nearby reports.',
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(
        errorMessage: 'An unexpected error occurred.',
        isLoading: false,
      );
    }
  }

  ComplaintModel _cloneComplaintWithStatus(ComplaintModel orig, String status) {
    return ComplaintModel(
      id: orig.id,
      title: orig.title,
      description: orig.description,
      category: orig.category,
      status: status,
      priority: orig.priority,
      longitude: orig.longitude,
      latitude: orig.latitude,
      address: orig.address,
      citizen: orig.citizen,
      assignedAuthority: orig.assignedAuthority,
      images: orig.images,
      createdAt: orig.createdAt,
      updatedAt: DateTime.now(),
    );
  }

  @override
  void dispose() {
    _statusSub?.cancel();
    _assignSub?.cancel();
    _newComplaintSub?.cancel();
    super.dispose();
  }
}

/**
 * Global Riverpod provider managing paginated nearby complaints lists
 */
final nearbyComplaintsProvider =
    StateNotifierProvider<NearbyComplaintsNotifier, NearbyComplaintsState>((ref) {
  return NearbyComplaintsNotifier(ref);
});
