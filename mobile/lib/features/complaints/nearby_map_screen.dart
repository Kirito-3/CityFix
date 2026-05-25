import 'dart:async';
import 'dart:io';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:geolocator/geolocator.dart';

import '../../config/theme.dart';
import '../../providers/live_map_state_provider.dart';
import '../../providers/nearby_complaints_provider.dart';
import '../../providers/map_marker_provider.dart';
import '../../models/complaint_model.dart';
import '../../widgets/foundations.dart';

/**
 * Gorgeous, Premium Civic Nearby Map Screen.
 * Places active complaints pin markings geographically and manages floating preview overlays.
 */
class NearbyComplaintsMapScreen extends ConsumerStatefulWidget {
  const NearbyComplaintsMapScreen({super.key});

  @override
  ConsumerState<NearbyComplaintsMapScreen> createState() => _NearbyComplaintsMapScreenState();
}

class _NearbyComplaintsMapScreenState extends ConsumerState<NearbyComplaintsMapScreen> {
  GoogleMapController? _mapController;
  bool _gpsPermissionGranted = false;
  bool _isLocatingUser = true;

  // Throttler helper to prevent double API posts during rapid map pan actions
  Timer? _cameraDebounce;

  @override
  void initState() {
    super.initState();
    _requestGpsPermissionsAndLocate();
  }

  @override
  void dispose() {
    _cameraDebounce?.cancel();
    _mapController?.dispose();
    super.dispose();
  }

  /**
   * Requests OS location permissions and zooms camera to user coordinates
   */
  Future<void> _requestGpsPermissionsAndLocate() async {
    // Gracefully bypass full GPS hooks on unsupported Windows runners
    if (!kIsWeb && Platform.isWindows) {
      setState(() {
        _gpsPermissionGranted = true;
        _isLocatingUser = false;
      });
      // Trigger default mock coordinates fetch
      WidgetsBinding.instance.addPostFrameCallback((_) {
        ref.read(nearbyComplaintsProvider.notifier).fetchNearby();
      });
      return;
    }

    try {
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }

      if (permission == LocationPermission.always || permission == LocationPermission.whileInUse) {
        setState(() {
          _gpsPermissionGranted = true;
        });

        // Load active coordinates
        final position = await Geolocator.getCurrentPosition(
          desiredAccuracy: LocationAccuracy.high,
        );

        ref.read(liveMapStateProvider.notifier).updateCameraCenter(
              position.latitude,
              position.longitude,
            );

        _animateCameraToPosition(position.latitude, position.longitude);
      } else {
        setState(() {
          _gpsPermissionGranted = false;
        });
      }
    } catch (e) {
      debugPrint('Nearby map initialization permissions failed: $e');
    } finally {
      setState(() {
        _isLocatingUser = false;
      });
      // Fire primary fetch matching coordinates
      ref.read(nearbyComplaintsProvider.notifier).fetchNearby();
    }
  }

  void _animateCameraToPosition(double lat, double lng) {
    if (_mapController == null) return;
    _mapController!.animateCamera(
      CameraUpdate.newCameraPosition(
        CameraPosition(target: LatLng(lat, lng), zoom: 14.5),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final markers = ref.watch(mapMarkerProvider);
    final mapState = ref.watch(liveMapStateProvider);
    final selectedComplaint = ref.watch(selectedMapComplaintProvider);
    final nearbyState = ref.watch(nearbyComplaintsProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final isWindowsDevice = !kIsWeb && Platform.isWindows;

    return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
      appBar: AppBar(
        title: const Text(
          'Nearby Incident Feed',
          style: TextStyle(fontFamily: 'Outfit', fontWeight: FontWeight.bold),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => context.pop(),
        ),
      ),
      body: isWindowsDevice
          ? _buildWindowsMockPreview(nearbyState, mapState, isDark)
          : Stack(
              children: [
                // 1. Google Map canvas layer
                if (_gpsPermissionGranted)
                  GoogleMap(
                    initialCameraPosition: CameraPosition(
                      target: LatLng(mapState.centerLatitude, mapState.centerLongitude),
                      zoom: 14,
                    ),
                    markers: markers,
                    myLocationEnabled: true,
                    myLocationButtonEnabled: false,
                    zoomControlsEnabled: false,
                    onMapCreated: (controller) {
                      _mapController = controller;
                      if (_gpsPermissionGranted) {
                        _animateCameraToPosition(mapState.centerLatitude, mapState.centerLongitude);
                      }
                    },
                    onCameraMove: (position) {
                      // Save center boundaries in state settings
                      ref.read(liveMapStateProvider.notifier).updateCameraCenter(
                            position.target.latitude,
                            position.target.longitude,
                          );

                      // Throttle dynamic boundary updates to prevent API flooding
                      _cameraDebounce?.cancel();
                      _cameraDebounce = Timer(const Duration(milliseconds: 600), () {
                        ref.read(nearbyComplaintsProvider.notifier).fetchNearby();
                      });
                    },
                    onTap: (_) {
                      // Tap background to hide the bottom detail card
                      ref.read(selectedMapComplaintProvider.notifier).state = null;
                    },
                  )
                else
                  _buildNoPermissionsPlaceholder(isDark),

                // 2. Sticky category/radius filters deck
                Positioned(
                  top: 12,
                  left: 12,
                  right: 12,
                  child: _buildStickyFiltersDeck(mapState, isDark),
                ),

                // 3. User location floating shortcut button
                if (_gpsPermissionGranted && !_isLocatingUser)
                  Positioned(
                    right: 16,
                    bottom: selectedComplaint != null ? 180 : 16,
                    child: FloatingActionButton(
                      mini: true,
                      backgroundColor: isDark ? AppColors.surfaceDark : Colors.white,
                      foregroundColor: AppColors.accent,
                      child: const Icon(Icons.my_location_rounded),
                      onPressed: () async {
                        setState(() => _isLocatingUser = true);
                        await _requestGpsPermissionsAndLocate();
                      },
                    ),
                  ),

                // 4. Loading overlay progress ring
                if (nearbyState.isLoading)
                  const Positioned(
                    top: 130,
                    left: 0,
                    right: 0,
                    child: Center(
                      child: Card(
                        elevation: 4,
                        child: Padding(
                          padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              SizedBox(
                                width: 14,
                                height: 14,
                                child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.accent),
                              ),
                              SizedBox(width: 10),
                              Text(
                                'Syncing nearby pins...',
                                style: TextStyle(fontSize: 12, fontFamily: 'Outfit', fontWeight: FontWeight.bold),
                              )
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),

                // 5. Sliding active preview card bottom sheet
                if (selectedComplaint != null)
                  Positioned(
                    left: 16,
                    right: 16,
                    bottom: 16,
                    child: _buildPreviewCard(selectedComplaint, isDark),
                  ),
              ],
            ),
    );
  }

  /**
   * Floating overlay ChoiceChips filters deck
   */
  Widget _buildStickyFiltersDeck(LiveMapState mapState, bool isDark) {
    const categories = ['All', 'Roads', 'Water', 'Waste', 'Electricity', 'Other'];
    final selectedCategory = mapState.categoryFilter ?? 'All';

    return Container(
      padding: const EdgeInsets.symmetric(vertical: 8),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark.withOpacity(0.9) : Colors.white.withOpacity(0.9),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.06), blurRadius: 10, offset: const Offset(0, 4)),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Radius pills
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Row(
              children: [
                const Icon(Icons.radar_rounded, size: 16, color: AppColors.accent),
                const SizedBox(width: 6),
                const Text(
                  'Search Radius: ',
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, fontFamily: 'Outfit'),
                ),
                const Spacer(),
                ...[1000.0, 3000.0, 5000.0].map((radius) {
                  final isSelected = mapState.radiusInMeters == radius;
                  final label = '${(radius / 1000).toInt()}km';
                  return Padding(
                    padding: const EdgeInsets.only(left: 6),
                    child: InkWell(
                      onTap: () {
                        ref.read(liveMapStateProvider.notifier).updateRadius(radius);
                        ref.read(nearbyComplaintsProvider.notifier).fetchNearby();
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: isSelected ? AppColors.accent : Colors.transparent,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: isSelected ? Colors.transparent : (isDark ? AppColors.borderDark : AppColors.borderLight),
                          ),
                        ),
                        child: Text(
                          label,
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color: isSelected ? Colors.white : (isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
                            fontFamily: 'Outfit',
                          ),
                        ),
                      ),
                    ),
                  );
                }),
              ],
            ),
          ),
          const Divider(height: 12, thickness: 0.5),
          // Category horizontal scroll
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Row(
              children: categories.map((cat) {
                final isSelected = selectedCategory.toLowerCase() == cat.toLowerCase();
                return Padding(
                  padding: const EdgeInsets.only(right: 6),
                  child: ChoiceChip(
                    label: Text(
                      cat,
                      style: TextStyle(
                        fontSize: 11,
                        color: isSelected ? Colors.white : (isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
                      ),
                    ),
                    selected: isSelected,
                    selectedColor: AppColors.accent,
                    backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
                    onSelected: (_) {
                      ref.read(liveMapStateProvider.notifier).updateCategory(cat == 'All' ? null : cat);
                      ref.read(nearbyComplaintsProvider.notifier).fetchNearby();
                    },
                    showCheckmark: false,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    visualDensity: VisualDensity.compact,
                  ),
                );
              }).toList(),
            ),
          )
        ],
      ),
    );
  }

  /**
   * Floating detail preview card displaying complaint summary
   */
  Widget _buildPreviewCard(ComplaintModel complaint, bool isDark) {
    final statusColor = _getStatusColor(complaint.status);
    final priorityColor = _getPriorityColor(complaint.priority);

    return Container(
      height: 135,
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight, width: 1.5),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.12), blurRadius: 15, offset: const Offset(0, 6)),
        ],
      ),
      child: Row(
        children: [
          // Image preview or Category Icon fallback
          ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: SizedBox(
              width: 80,
              height: 80,
              child: complaint.images.isNotEmpty
                  ? Image.network(
                      complaint.images.first,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => _buildCategoryColorBanner(complaint),
                    )
                  : _buildCategoryColorBanner(complaint),
            ),
          ),
          const SizedBox(width: AppSpacing.md),

          // Details text layout
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: statusColor.withOpacity(0.12),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        complaint.status,
                        style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: statusColor, fontFamily: 'Outfit'),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: priorityColor.withOpacity(0.12),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        complaint.priority.toUpperCase(),
                        style: TextStyle(fontSize: 9, fontWeight: FontWeight.w900, color: priorityColor, fontFamily: 'Outfit'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  complaint.title,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                    fontFamily: 'Outfit',
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                Expanded(
                  child: Text(
                    complaint.address,
                    style: TextStyle(
                      fontSize: 12,
                      color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                      fontFamily: 'Outfit',
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const SizedBox(height: 6),
                // Click navigation deep-link action button
                SizedBox(
                  height: 30,
                  width: double.infinity,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      padding: EdgeInsets.zero,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    onPressed: () {
                      context.push('/complaints/${complaint.id}');
                    },
                    child: const Text('View Timeline Stepper ➜', style: TextStyle(fontSize: 12)),
                  ),
                )
              ],
            ),
          )
        ],
      ),
    );
  }

  Widget _buildCategoryColorBanner(ComplaintModel complaint) {
    final color = _getCategoryColor(complaint.category);
    return Container(
      color: color.withOpacity(0.15),
      child: Center(
        child: Icon(_getCategoryIcon(complaint.category), color: color, size: 28),
      ),
    );
  }

  Widget _buildNoPermissionsPlaceholder(bool isDark) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.xl),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.location_off_rounded, size: 70, color: AppColors.error),
            const SizedBox(height: 16),
            const Text(
              'Location Permissions Denied',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, fontFamily: 'Outfit'),
            ),
            const SizedBox(height: 8),
            Text(
              'Interactive map feed requires active GPS boundaries permissions. Go to settings and enable permissions to view nearby reports.',
              style: TextStyle(
                fontSize: 13,
                color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                fontFamily: 'Outfit',
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  /**
   * Graceful Windows mockup visualizer presenting nearby reports list chronologically alongside distance metrics
   */
  Widget _buildWindowsMockPreview(NearbyComplaintsState state, LiveMapState mapState, bool isDark) {
    return Column(
      children: [
        // Settings deck
        Padding(
          padding: const EdgeInsets.all(12),
          child: _buildStickyFiltersDeck(mapState, isDark),
        ),

        // Windows Simulated visual map bar
        Container(
          margin: const EdgeInsets.symmetric(horizontal: 12),
          padding: const EdgeInsets.all(16),
          width: double.infinity,
          decoration: BoxDecoration(
            color: isDark ? AppColors.surfaceDark : Colors.teal.shade50.withOpacity(0.4),
            border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Column(
            children: [
              const Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.radar_rounded, color: AppColors.accent),
                  SizedBox(width: 8),
                  Text(
                    'WINDOWS COMPATIBILITY MOCK RADAR ACTIVE',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.accent, fontFamily: 'Outfit'),
                  )
                ],
              ),
              const SizedBox(height: 6),
              Text(
                'Searching from GPS Coordinates: Lat: ${mapState.centerLatitude.toStringAsFixed(6)} • Lng: ${mapState.centerLongitude.toStringAsFixed(6)}',
                style: const TextStyle(fontSize: 11, fontStyle: FontStyle.italic, fontFamily: 'Outfit'),
              )
            ],
          ),
        ),

        const SizedBox(height: 12),

        // Lists index
        Expanded(
          child: RefreshIndicator(
            onRefresh: () async {
              await ref.read(nearbyComplaintsProvider.notifier).fetchNearby();
            },
            child: _buildWindowsList(state, isDark),
          ),
        )
      ],
    );
  }

  Widget _buildWindowsList(NearbyComplaintsState state, bool isDark) {
    if (state.isLoading) {
      return _buildSkeletonList(isDark);
    }

    if (state.errorMessage != null) {
      return CustomErrorWidget(message: state.errorMessage!);
    }

    if (state.complaints.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.radar_rounded, size: 60, color: Colors.grey.withOpacity(0.3)),
            const SizedBox(height: 12),
            const Text(
              'No Nearby Issues Found',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, fontFamily: 'Outfit'),
            ),
            const SizedBox(height: 6),
            const Text(
              'Try increasing the search radius pill inside the headers.',
              style: TextStyle(fontSize: 12, color: Colors.grey, fontFamily: 'Outfit'),
            )
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      itemCount: state.complaints.length,
      itemBuilder: (context, index) {
        final complaint = state.complaints[index];
        final statusColor = _getStatusColor(complaint.status);
        final categoryColor = _getCategoryColor(complaint.category);

        return Card(
          margin: const EdgeInsets.only(bottom: 10),
          color: isDark ? AppColors.surfaceDark : Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          child: ListTile(
            leading: CircleAvatar(
              backgroundColor: categoryColor.withOpacity(0.12),
              child: Icon(_getCategoryIcon(complaint.category), color: categoryColor, size: 20),
            ),
            title: Text(
              complaint.title,
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, fontFamily: 'Outfit'),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            subtitle: Text(
              complaint.address,
              style: const TextStyle(fontSize: 12, fontFamily: 'Outfit'),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            trailing: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: statusColor.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: statusColor.withOpacity(0.4)),
                  ),
                  child: Text(
                    complaint.status,
                    style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: statusColor, fontFamily: 'Outfit'),
                  ),
                ),
                const SizedBox(width: 6),
                const Icon(Icons.arrow_forward_ios_rounded, size: 14),
              ],
            ),
            onTap: () {
              context.push('/complaints/${complaint.id}');
            },
          ),
        );
      },
    );
  }

  Widget _buildSkeletonList(bool isDark) {
    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      itemCount: 4,
      itemBuilder: (context, index) {
        return Container(
          margin: const EdgeInsets.only(bottom: 10),
          height: 65,
          decoration: BoxDecoration(
            color: isDark ? AppColors.surfaceDark : Colors.white,
            borderRadius: BorderRadius.circular(12),
          ),
        );
      },
    );
  }

  // Helper mappings
  IconData _getCategoryIcon(String category) {
    switch (category.toLowerCase()) {
      case 'roads':
        return Icons.add_road_rounded;
      case 'water':
        return Icons.water_drop_rounded;
      case 'waste':
        return Icons.delete_sweep_rounded;
      case 'electricity':
        return Icons.electrical_services_rounded;
      default:
        return Icons.construction_rounded;
    }
  }

  Color _getCategoryColor(String category) {
    switch (category.toLowerCase()) {
      case 'roads':
        return Colors.indigo;
      case 'water':
        return Colors.teal;
      case 'waste':
        return Colors.brown;
      case 'electricity':
        return Colors.amber.shade800;
      default:
        return AppColors.accent;
    }
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'submitted':
        return AppColors.info;
      case 'under review':
      case 'under_review':
        return Colors.purple;
      case 'assigned':
        return Colors.orange;
      case 'in progress':
      case 'in_progress':
        return AppColors.warning;
      case 'resolved':
        return AppColors.success;
      case 'rejected':
        return AppColors.error;
      default:
        return AppColors.textSecondaryLight;
    }
  }

  Color _getPriorityColor(String priority) {
    switch (priority.toLowerCase()) {
      case 'high':
        return AppColors.error;
      case 'medium':
        return AppColors.warning;
      case 'low':
      default:
        return AppColors.success;
    }
  }
}
