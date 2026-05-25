import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../models/complaint_model.dart';
import 'nearby_complaints_provider.dart';

/**
 * Global State Provider holding the currently tapped map complaint marker
 */
final selectedMapComplaintProvider = StateProvider<ComplaintModel?>((ref) => null);

/**
 * Derived map marker builder provider.
 * Listens to nearbyComplaintsProvider and translates models list into Google Maps Markers.
 */
final mapMarkerProvider = Provider<Set<Marker>>((ref) {
  final complaintsState = ref.watch(nearbyComplaintsProvider);

  return complaintsState.complaints.map((complaint) {
    final statusColorHue = _getStatusHue(complaint.status);

    return Marker(
      markerId: MarkerId(complaint.id),
      position: LatLng(complaint.latitude, complaint.longitude),
      icon: BitmapDescriptor.defaultMarkerWithHue(statusColorHue),
      onTap: () {
        // Update active selection state to trigger sliding preview bottom sheet
        ref.read(selectedMapComplaintProvider.notifier).state = complaint;
      },
    );
  }).toSet();
});

// Formatting helper mapping status logs to standard marker color hues
double _getStatusHue(String status) {
  switch (status.toLowerCase()) {
    case 'submitted':
      return BitmapDescriptor.hueBlue;
    case 'under review':
    case 'under_review':
      return BitmapDescriptor.hueViolet;
    case 'assigned':
      return BitmapDescriptor.hueYellow;
    case 'in progress':
    case 'in_progress':
      return BitmapDescriptor.hueOrange;
    case 'resolved':
      return BitmapDescriptor.hueGreen;
    case 'rejected':
    default:
      return BitmapDescriptor.hueRed;
  }
}
