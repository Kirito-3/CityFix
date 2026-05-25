import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/api_client.dart';
import '../models/complaint_model.dart';

/**
 * Encapsulates the entire paginated history list state and active query filters
 */
class ComplaintHistoryState {
  final List<ComplaintModel> complaints;
  final int page;
  final bool hasMore;
  final bool isLoading;
  final bool isFetchingMore;
  final String? errorMessage;

  // Active filters
  final String? statusFilter;
  final String? categoryFilter;
  final String? priorityFilter;

  ComplaintHistoryState({
    this.complaints = const [],
    this.page = 1,
    this.hasMore = true,
    this.isLoading = false,
    this.isFetchingMore = false,
    this.errorMessage,
    this.statusFilter,
    this.categoryFilter,
    this.priorityFilter,
  });

  ComplaintHistoryState copyWith({
    List<ComplaintModel>? complaints,
    int? page,
    bool? hasMore,
    bool? isLoading,
    bool? isFetchingMore,
    String? errorMessage,
    String? statusFilter,
    String? categoryFilter,
    String? priorityFilter,
    bool clearStatus = false,
    bool clearCategory = false,
    bool clearPriority = false,
  }) {
    return ComplaintHistoryState(
      complaints: complaints ?? this.complaints,
      page: page ?? this.page,
      hasMore: hasMore ?? this.hasMore,
      isLoading: isLoading ?? this.isLoading,
      isFetchingMore: isFetchingMore ?? this.isFetchingMore,
      errorMessage: errorMessage, // Resets error if null is passed
      statusFilter: clearStatus ? null : (statusFilter ?? this.statusFilter),
      categoryFilter: clearCategory ? null : (categoryFilter ?? this.categoryFilter),
      priorityFilter: clearPriority ? null : (priorityFilter ?? this.priorityFilter),
    );
  }
}

/**
 * Orchestrates paginated complaint queries and filter selection.
 */
class ComplaintHistoryNotifier extends StateNotifier<ComplaintHistoryState> {
  ComplaintHistoryNotifier() : super(ComplaintHistoryState());

  final Dio _dio = ApiClient.instance.client;
  static const int _limit = 10;

  /**
   * Fetches registered complaints matching current filters.
   */
  Future<void> fetchHistory({bool isRefresh = false}) async {
    // Prevent double fetches or fetches if we've hit the end
    if (state.isLoading || state.isFetchingMore) return;
    if (!isRefresh && !state.hasMore) return;

    final bool loadingFirstPage = isRefresh || state.complaints.isEmpty;
    final int targetPage = loadingFirstPage ? 1 : state.page + 1;

    if (loadingFirstPage) {
      state = state.copyWith(isLoading: true, complaints: [], page: 1, hasMore: true);
    } else {
      state = state.copyWith(isFetchingMore: true);
    }

    try {
      // Build dynamic query parameters Map
      final Map<String, dynamic> queryParams = {
        'page': targetPage,
        'limit': _limit,
      };

      if (state.statusFilter != null) {
        queryParams['status'] = state.statusFilter;
      }
      if (state.categoryFilter != null) {
        queryParams['category'] = state.categoryFilter;
      }
      if (state.priorityFilter != null) {
        queryParams['priority'] = state.priorityFilter;
      }

      final response = await _dio.get('/complaints', queryParameters: queryParams);

      if (response.statusCode == 200 && response.data['success'] == true) {
        final List<dynamic> complaintsList = response.data['data']['complaints'];
        final fetchedComplaints = complaintsList.map((c) => ComplaintModel.fromJson(c)).toList();

        final pagination = response.data['data']['pagination'];
        final totalCount = pagination['totalCount'] as int? ?? 0;

        final newComplaints = loadingFirstPage
            ? fetchedComplaints
            : [...state.complaints, ...fetchedComplaints];

        state = state.copyWith(
          complaints: newComplaints,
          page: targetPage,
          hasMore: newComplaints.length < totalCount,
          isLoading: false,
          isFetchingMore: false,
        );
      } else {
        state = state.copyWith(
          errorMessage: response.data['message'] ?? 'Failed to retrieve list.',
          isLoading: false,
          isFetchingMore: false,
        );
      }
    } on DioException catch (e) {
      state = state.copyWith(
        errorMessage: e.response?.data['message'] ?? 'Connection error: failed to retrieve list.',
        isLoading: false,
        isFetchingMore: false,
      );
    } catch (e) {
      state = state.copyWith(
        errorMessage: 'An unexpected error occurred.',
        isLoading: false,
        isFetchingMore: false,
      );
    }
  }

  /**
   * Updates status query filter.
   */
  void setStatusFilter(String? status) {
    if (status == state.statusFilter) return;
    state = state.copyWith(
      statusFilter: status,
      clearStatus: status == null,
    );
    fetchHistory(isRefresh: true);
  }

  /**
   * Updates category query filter.
   */
  void setCategoryFilter(String? category) {
    if (category == state.categoryFilter) return;
    state = state.copyWith(
      categoryFilter: category,
      clearCategory: category == null,
    );
    fetchHistory(isRefresh: true);
  }

  /**
   * Updates priority query filter.
   */
  void setPriorityFilter(String? priority) {
    if (priority == state.priorityFilter) return;
    state = state.copyWith(
      priorityFilter: priority,
      clearPriority: priority == null,
    );
    fetchHistory(isRefresh: true);
  }

  /**
   * Resets all search filters back to default empty criteria.
   */
  void resetFilters() {
    state = state.copyWith(
      clearStatus: true,
      clearCategory: true,
      clearPriority: true,
    );
    fetchHistory(isRefresh: true);
  }
}

/**
 * Global Riverpod provider exposing paginated history and filter states
 */
final complaintHistoryProvider =
    StateNotifierProvider<ComplaintHistoryNotifier, ComplaintHistoryState>((ref) {
  return ComplaintHistoryNotifier();
});
