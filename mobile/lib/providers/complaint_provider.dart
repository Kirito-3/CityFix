import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/api_client.dart';
import '../models/complaint_model.dart';

/**
 * Immutable State wrapper encapsulating active Complaint and Timeline values
 */
class ComplaintState {
  final List<ComplaintModel> complaints;
  final ComplaintModel? selectedComplaint;
  final List<StatusLogModel> selectedTimeline;
  final bool isLoading;
  final String? errorMessage;

  ComplaintState({
    this.complaints = const [],
    this.selectedComplaint,
    this.selectedTimeline = const [],
    this.isLoading = false,
    this.errorMessage,
  });

  ComplaintState copyWith({
    List<ComplaintModel>? complaints,
    ComplaintModel? selectedComplaint,
    List<StatusLogModel>? selectedTimeline,
    bool? isLoading,
    String? errorMessage,
  }) {
    return ComplaintState(
      complaints: complaints ?? this.complaints,
      selectedComplaint: selectedComplaint ?? this.selectedComplaint,
      selectedTimeline: selectedTimeline ?? this.selectedTimeline,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage,
    );
  }
}

/**
 * Notifier orchestration class managing complaints REST endpoints communications
 */
class ComplaintNotifier extends StateNotifier<ComplaintState> {
  ComplaintNotifier() : super(ComplaintState());

  final Dio _dio = ApiClient.instance.client;

  /**
   * Retrieves paginated complaints registered by the citizen.
   */
  Future<void> fetchComplaints() async {
    state = state.copyWith(isLoading: true);
    try {
      final response = await _dio.get('/complaints');
      
      if (response.statusCode == 200 && response.data['success'] == true) {
        final List<dynamic> complaintsList = response.data['data']['complaints'];
        final complaints = complaintsList.map((c) => ComplaintModel.fromJson(c)).toList();
        state = state.copyWith(complaints: complaints, isLoading: false);
      } else {
        state = state.copyWith(errorMessage: response.data['message'], isLoading: false);
      }
    } on DioException catch (e) {
      state = state.copyWith(
        errorMessage: e.response?.data['message'] ?? 'Failed to load complaints.',
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(errorMessage: 'Unexpected error occurred.', isLoading: false);
    }
  }

  /**
   * Retrieves individual complaint detail and populate its status timeline log.
   */
  Future<void> fetchComplaintById(String id) async {
    state = state.copyWith(isLoading: true);
    try {
      final response = await _dio.get('/complaints/$id');
      
      if (response.statusCode == 200 && response.data['success'] == true) {
        final data = response.data['data'];
        
        final complaint = ComplaintModel.fromJson(data['complaint']);
        final List<dynamic> timelineData = data['timeline'];
        final timeline = timelineData.map((log) => StatusLogModel.fromJson(log)).toList();

        state = state.copyWith(
          selectedComplaint: complaint,
          selectedTimeline: timeline,
          isLoading: false,
        );
      } else {
        state = state.copyWith(errorMessage: response.data['message'], isLoading: false);
      }
    } on DioException catch (e) {
      state = state.copyWith(
        errorMessage: e.response?.data['message'] ?? 'Failed to load complaint details.',
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(errorMessage: 'Unexpected error occurred.', isLoading: false);
    }
  }

  /**
   * Files a new civic issue report.
   * Leverages Multipart FormData to compile coordinate strings and local file pickers buffers.
   */
  Future<bool> createComplaint({
    required String title,
    required String description,
    required String category,
    required String priority,
    required double longitude,
    required double latitude,
    required String address,
    required List<String> localImagePaths, // Picked from image_picker
  }) async {
    state = state.copyWith(isLoading: true);
    try {
      // 1. Construct form-data fields (Zod Preprocessors on backend will parseFloat coord strings)
      final Map<String, dynamic> formMap = {
        'title': title,
        'description': description,
        'category': category,
        'priority': priority,
        'longitude': longitude.toString(),
        'latitude': latitude.toString(),
        'address': address,
      };

      final formData = FormData.fromMap(formMap);

      // 2. Append multiple images using MultipartFile.fromFile
      for (final path in localImagePaths) {
        final filename = path.split('/').last;
        formData.files.add(
          MapEntry(
            'images',
            await MultipartFile.fromFile(path, filename: filename),
          ),
        );
      }

      // 3. Post to REST API multipart endpoint
      final response = await _dio.post('/complaints', data: formData);

      if (response.statusCode == 201 && response.data['success'] == true) {
        // Fetch fresh complaints list to populate dashboard
        await fetchComplaints();
        return true;
      } else {
        state = state.copyWith(
          errorMessage: response.data['message'] ?? 'Failed to file report.',
          isLoading: false,
        );
        return false;
      }
    } on DioException catch (e) {
      state = state.copyWith(
        errorMessage: e.response?.data['message'] ?? 'Failed to file report. Connection lost.',
        isLoading: false,
      );
      return false;
    } catch (e) {
      state = state.copyWith(
        errorMessage: 'An unexpected error occurred during filing.',
        isLoading: false,
      );
      return false;
    }
  }

  /**
   * Helper to clear errors
   */
  void clearError() {
    state = state.copyWith(errorMessage: null);
  }
}

/**
 * Global Riverpod StateNotifierProvider wrapping complaint flows
 */
final complaintProvider = StateNotifierProvider<ComplaintNotifier, ComplaintState>((ref) {
  return ComplaintNotifier();
});
