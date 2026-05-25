import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/api_client.dart';
import '../models/complaint_model.dart';
import '../models/user_model.dart';
import '../services/socket_service.dart';

/**
 * Encapsulates the detail state of a single civic issue report and its timeline status log
 */
class ComplaintDetailState {
  final ComplaintModel? complaint;
  final List<StatusLogModel> timeline;
  final bool isLoading;
  final String? errorMessage;

  ComplaintDetailState({
    this.complaint,
    this.timeline = const [],
    this.isLoading = false,
    this.errorMessage,
  });

  ComplaintDetailState copyWith({
    ComplaintModel? complaint,
    List<StatusLogModel>? timeline,
    bool? isLoading,
    String? errorMessage,
  }) {
    return ComplaintDetailState(
      complaint: complaint ?? this.complaint,
      timeline: timeline ?? this.timeline,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage,
    );
  }
}

/**
 * Manages unique complaint detail sheets and real-time timeline stepper updates.
 */
class ComplaintDetailNotifier extends StateNotifier<ComplaintDetailState> {
  ComplaintDetailNotifier() : super(ComplaintDetailState()) {
    _subscribeToLiveEvents();
  }

  final Dio _dio = ApiClient.instance.client;
  final SocketService _socketService = SocketService.instance;

  StreamSubscription? _statusSub;
  StreamSubscription? _assignSub;

  /**
   * Registers listeners to incoming Socket.IO events to update state in-memory.
   */
  void _subscribeToLiveEvents() {
    // 1. Live status log changes
    _statusSub = _socketService.onStatusChanged.listen((data) {
      final currentId = state.complaint?.id;
      if (currentId == null || data['complaintId'] != currentId) return;

      final prevStatus = data['previousStatus'] ?? 'Submitted';
      final nextStatus = data['newStatus'] ?? 'Submitted';
      final remarks = data['remarks'] ?? '';
      final dateStr = data['updatedAt'];
      final date = dateStr != null ? DateTime.parse(dateStr) : DateTime.now();

      // Create new status log model locally
      final newLog = StatusLogModel(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        complaintId: currentId,
        changedByName: 'System Authority',
        changedByRole: 'admin',
        previousStatus: prevStatus,
        newStatus: nextStatus,
        remarks: remarks,
        createdAt: date,
      );

      // Re-create the Complaint model with the updated status
      final updatedComplaint = _cloneComplaintWithStatus(state.complaint!, nextStatus);

      state = state.copyWith(
        complaint: updatedComplaint,
        timeline: [newLog, ...state.timeline], // Add to front (chronological order check)
      );
    });

    // 2. Live authority assignments
    _assignSub = _socketService.onAuthorityAssigned.listen((data) {
      final currentId = state.complaint?.id;
      if (currentId == null || data['complaintId'] != currentId) return;

      final officerName = data['authority']?['name'] ?? 'Department Officer';
      final nextStatus = data['status'] ?? 'under_review';
      final remarks = data['remarks'] ?? '';

      final newLog = StatusLogModel(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        complaintId: currentId,
        changedByName: 'System Admin',
        changedByRole: 'admin',
        previousStatus: state.complaint!.status,
        newStatus: nextStatus,
        remarks: remarks,
        createdAt: DateTime.now(),
      );

      // Construct a dummy authority model locally
      final updatedAuthority = UserModel(
        id: data['authority']?['id'] ?? '',
        name: officerName,
        email: '',
        role: 'authority',
        phone: '',
      );

      // Clone complaint with assignment and status
      final updatedComplaint = _cloneComplaintWithStatusAndAssignee(
        state.complaint!,
        nextStatus,
        updatedAuthority,
      );

      state = state.copyWith(
        complaint: updatedComplaint,
        timeline: [newLog, ...state.timeline],
      );
    });
  }

  /**
   * Loads the complaint card's full information sheet and status logs timeline.
   */
  Future<void> fetchDetails(String complaintId) async {
    state = state.copyWith(isLoading: true, errorMessage: null);

    try {
      final response = await _dio.get('/complaints/$complaintId');

      if (response.statusCode == 200 && response.data['success'] == true) {
        final data = response.data['data'];
        final complaint = ComplaintModel.fromJson(data['complaint']);

        final List<dynamic> logsList = data['timeline'] ?? [];
        final logs = logsList.map((log) => StatusLogModel.fromJson(log)).toList();

        // Sort logs in reverse chronological order (newest first)
        logs.sort((a, b) => b.createdAt.compareTo(a.createdAt));

        state = ComplaintDetailState(
          complaint: complaint,
          timeline: logs,
          isLoading: false,
        );

        // Join live websocket update room for this complaint
        _socketService.joinComplaintRoom(complaintId);
      } else {
        state = state.copyWith(
          errorMessage: response.data['message'] ?? 'Failed to load details.',
          isLoading: false,
        );
      }
    } on DioException catch (e) {
      state = state.copyWith(
        errorMessage: e.response?.data['message'] ?? 'Connection error: failed to load details.',
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
   * Clears state and unsubscribes from the websocket room when leaving details view.
   */
  void leaveDetailScreen() {
    final activeId = state.complaint?.id;
    if (activeId != null) {
      _socketService.leaveComplaintRoom(activeId);
    }
    state = ComplaintDetailState(); // reset to empty state
  }

  // Clone helpers to preserve immutable state structures
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

  ComplaintModel _cloneComplaintWithStatusAndAssignee(
      ComplaintModel orig, String status, UserModel assignee) {
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
      assignedAuthority: assignee,
      images: orig.images,
      createdAt: orig.createdAt,
      updatedAt: DateTime.now(),
    );
  }

  @override
  void dispose() {
    _statusSub?.cancel();
    _assignSub?.cancel();
    super.dispose();
  }
}

/**
 * Global Riverpod provider exposing state and status events of the active detail sheet
 */
final complaintDetailProvider =
    StateNotifierProvider<ComplaintDetailNotifier, ComplaintDetailState>((ref) {
  return ComplaintDetailNotifier();
});
