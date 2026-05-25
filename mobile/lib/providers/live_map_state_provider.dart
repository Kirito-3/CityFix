import 'package:flutter_riverpod/flutter_riverpod.dart';

/**
 * Immutable State encapsulation for live maps settings
 */
class LiveMapState {
  final double centerLatitude;
  final double centerLongitude;
  final double radiusInMeters; // distance search radius (e.g. 1000m, 3000m, 5000m)
  final String? categoryFilter;
  final String? statusFilter;

  LiveMapState({
    required this.centerLatitude,
    required this.centerLongitude,
    this.radiusInMeters = 5000.0, // Default 5km radius
    this.categoryFilter,
    this.statusFilter,
  });

  LiveMapState copyWith({
    double? centerLatitude,
    double? centerLongitude,
    double? radiusInMeters,
    String? categoryFilter,
    String? statusFilter,
    bool clearCategory = false,
    bool clearStatus = false,
  }) {
    return LiveMapState(
      centerLatitude: centerLatitude ?? this.centerLatitude,
      centerLongitude: centerLongitude ?? this.centerLongitude,
      radiusInMeters: radiusInMeters ?? this.radiusInMeters,
      categoryFilter: clearCategory ? null : (categoryFilter ?? this.categoryFilter),
      statusFilter: clearStatus ? null : (statusFilter ?? this.statusFilter),
    );
  }
}

/**
 * Notifier orchestration class managing active search radius pills and GPS camera centers.
 */
class LiveMapStateNotifier extends StateNotifier<LiveMapState> {
  // Initialize with fallback Bengaluru mock location
  LiveMapStateNotifier()
      : super(LiveMapState(
          centerLatitude: 12.9716,
          centerLongitude: 77.5946,
        ));

  /**
   * Updates camera search center coordinates.
   */
  void updateCameraCenter(double lat, double lng) {
    state = state.copyWith(centerLatitude: lat, centerLongitude: lng);
  }

  /**
   * Updates distance search radius pill (in meters).
   */
  void updateRadius(double meters) {
    state = state.copyWith(radiusInMeters: meters);
  }

  /**
   * Updates category filter.
   */
  void updateCategory(String? category) {
    state = state.copyWith(
      categoryFilter: category,
      clearCategory: category == null,
    );
  }

  /**
   * Updates status filter.
   */
  void updateStatus(String? status) {
    state = state.copyWith(
      statusFilter: status,
      clearStatus: status == null,
    );
  }
}

/**
 * Global Riverpod provider exposing setting criteria for nearby maps
 */
final liveMapStateProvider =
    StateNotifierProvider<LiveMapStateNotifier, LiveMapState>((ref) {
  return LiveMapStateNotifier();
});
