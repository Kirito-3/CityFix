import 'dart:io';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:intl/intl.dart';

import '../../config/theme.dart';
import '../../providers/complaint_detail_provider.dart';
import '../../models/complaint_model.dart';
import '../../widgets/foundations.dart';

/**
 * High-fidelity, Premium Complaint Detail Sheet and Timeline Stepper Tracker Screen.
 * Listens to active Socket.IO rooms for real-time status transitions.
 */
class ComplaintDetailScreen extends ConsumerStatefulWidget {
  final String complaintId;
  const ComplaintDetailScreen({super.key, required this.complaintId});

  @override
  ConsumerState<ComplaintDetailScreen> createState() => _ComplaintDetailScreenState();
}

class _ComplaintDetailScreenState extends ConsumerState<ComplaintDetailScreen> {
  GoogleMapController? _mapController;

  @override
  void initState() {
    super.initState();
    // Dispatch fetch complaint details after widget mounts
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(complaintDetailProvider.notifier).fetchDetails(widget.complaintId);
    });
  }

  @override
  void dispose() {
    // Unsubscribe from Socket.IO timeline room and reset details provider state
    ref.read(complaintDetailProvider.notifier).leaveDetailScreen();
    _mapController?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(complaintDetailProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
      appBar: AppBar(
        title: const Text(
          'Report Information',
          style: TextStyle(
            fontFamily: 'Outfit',
            fontWeight: FontWeight.bold,
          ),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => context.pop(),
        ),
      ),
      body: _buildScreenContent(state, isDark),
    );
  }

  /**
   * Dispatches skeletal templates or full detail views
   */
  Widget _buildScreenContent(ComplaintDetailState state, bool isDark) {
    if (state.isLoading) {
      return _buildSkeletonLoader(isDark);
    }

    if (state.errorMessage != null) {
      return CustomErrorWidget(
        message: state.errorMessage!,
        onRetry: () => ref.read(complaintDetailProvider.notifier).fetchDetails(widget.complaintId),
      );
    }

    final complaint = state.complaint;
    if (complaint == null) {
      return const Center(child: Text('Complaint sheet details not found.'));
    }

    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 1. Image Slider Carousel or Category banner
          _buildImageSlideshow(complaint, isDark),

          Padding(
            padding: const EdgeInsets.all(AppSpacing.md),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // 2. Complaint Basic Metadata Header
                _buildMetadataHeader(complaint, isDark),
                const SizedBox(height: AppSpacing.lg),

                // 3. Location preview panel (Cross-platform Map with Windows fallback)
                _buildMapSection(complaint, isDark),
                const SizedBox(height: AppSpacing.lg),

                // 4. Chronological Status timeline stepper
                _buildTimelineStepper(state.timeline, isDark),
                const SizedBox(height: AppSpacing.xxl),
              ],
            ),
          )
        ],
      ),
    );
  }

  /**
   * Horizon scrollable slideshow displaying complaint media images
   */
  Widget _buildImageSlideshow(ComplaintModel complaint, bool isDark) {
    if (complaint.images.isEmpty) {
      // Return a beautiful category colored decorative banner if no image is attached
      final categoryColor = _getCategoryColor(complaint.category);
      return Container(
        height: 180,
        width: double.infinity,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [categoryColor.withOpacity(0.8), categoryColor.withOpacity(0.4)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                _getCategoryIcon(complaint.category),
                size: 60,
                color: Colors.white,
              ),
              const SizedBox(height: 8),
              Text(
                complaint.category.toUpperCase(),
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w900,
                  color: Colors.white,
                  letterSpacing: 1.5,
                  fontFamily: 'Outfit',
                ),
              ),
            ],
          ),
        ),
      );
    }

    return SizedBox(
      height: 240,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        itemCount: complaint.images.length,
        itemBuilder: (context, index) {
          final imageUrl = complaint.images[index];
          return Container(
            width: MediaQuery.of(context).size.width * 0.85,
            margin: const EdgeInsets.only(left: AppSpacing.md, top: AppSpacing.md),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.1),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                )
              ],
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: Image.network(
                imageUrl,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) => Container(
                  color: isDark ? AppColors.surfaceDark : Colors.grey.shade100,
                  child: const Center(
                    child: Icon(Icons.broken_image_outlined, size: 40, color: Colors.grey),
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  /**
   * Title, Description and assignment metrics header layout
   */
  Widget _buildMetadataHeader(ComplaintModel complaint, bool isDark) {
    final statusColor = _getStatusColor(complaint.status);
    final priorityColor = _getPriorityColor(complaint.priority);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Status & Priority Tags
        Row(
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
              decoration: BoxDecoration(
                color: statusColor.withOpacity(0.12),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: statusColor.withOpacity(0.4), width: 1),
              ),
              child: Row(
                children: [
                  Container(
                    width: 8,
                    height: 8,
                    decoration: BoxDecoration(color: statusColor, shape: BoxShape.circle),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    complaint.status,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: statusColor,
                      fontFamily: 'Outfit',
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: priorityColor.withOpacity(0.12),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                '${complaint.priority.toUpperCase()} PRIORITY',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w900,
                  color: priorityColor,
                  letterSpacing: 0.5,
                  fontFamily: 'Outfit',
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),

        // Complaint title
        Text(
          complaint.title,
          style: TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.bold,
            color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
            fontFamily: 'Outfit',
          ),
        ),
        const SizedBox(height: 8),

        // Description
        Text(
          complaint.description,
          style: TextStyle(
            fontSize: 15,
            color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
            height: 1.5,
            fontFamily: 'Outfit',
          ),
        ),
        const SizedBox(height: 16),
        const Divider(height: 1, thickness: 0.5),
        const SizedBox(height: 16),

        // Reporter and Department Assignee info
        Row(
          children: [
            Expanded(
              child: _buildInfoItem(
                label: 'REPORTED BY',
                value: complaint.citizen?.name ?? 'Anonymous Citizen',
                icon: Icons.person_outline_rounded,
                isDark: isDark,
              ),
            ),
            Expanded(
              child: _buildInfoItem(
                label: 'ASSIGNED OFFICER',
                value: complaint.assignedAuthority?.name ?? 'Under Review / Unassigned',
                icon: Icons.assignment_ind_outlined,
                isDark: isDark,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildInfoItem({
    required String label,
    required String value,
    required IconData icon,
    required bool isDark,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(
          icon,
          size: 20,
          color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 0.5,
                  color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                  fontFamily: 'Outfit',
                ),
              ),
              const SizedBox(height: 2),
              Text(
                value,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                  fontFamily: 'Outfit',
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  /**
   * Location Panel rendering interactive map snippets or graceful fallbacks
   */
  Widget _buildMapSection(ComplaintModel complaint, bool isDark) {
    // Graceful Windows / web preview fallback
    final bool isWindowsDevice = !kIsWeb && Platform.isWindows;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Icon(Icons.pin_drop_outlined, color: AppColors.accent, size: 20),
            const SizedBox(width: 6),
            Text(
              'Incident Location',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                fontFamily: 'Outfit',
              ),
            ),
          ],
        ),
        const SizedBox(height: 4),
        Text(
          complaint.address,
          style: TextStyle(
            fontSize: 13,
            color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
            fontFamily: 'Outfit',
          ),
        ),
        const SizedBox(height: 12),
        ClipRRect(
          borderRadius: BorderRadius.circular(16),
          child: SizedBox(
            height: 180,
            width: double.infinity,
            child: isWindowsDevice
                ? _buildWindowsMapFallback(complaint, isDark)
                : GoogleMap(
                    initialCameraPosition: CameraPosition(
                      target: LatLng(complaint.latitude, complaint.longitude),
                      zoom: 15,
                    ),
                    markers: {
                      Marker(
                        markerId: const MarkerId('complaint_loc'),
                        position: LatLng(complaint.latitude, complaint.longitude),
                        infoWindow: InfoWindow(title: complaint.category, snippet: complaint.address),
                      )
                    },
                    myLocationButtonEnabled: false,
                    zoomControlsEnabled: false,
                    onMapCreated: (controller) => _mapController = controller,
                  ),
          ),
        ),
      ],
    );
  }

  Widget _buildWindowsMapFallback(ComplaintModel complaint, bool isDark) {
    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : Colors.teal.shade50.withOpacity(0.5),
        border: Border.all(color: isDark ? AppColors.borderDark : AppColors.borderLight),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.map_outlined, size: 36, color: AppColors.accent),
          const SizedBox(height: 8),
          Text(
            'GPS Coordinates Loaded',
            style: TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 14,
              color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
              fontFamily: 'Outfit',
            ),
          ),
          const SizedBox(height: 2),
          Text(
            'Lat: ${complaint.latitude.toStringAsFixed(6)} • Lng: ${complaint.longitude.toStringAsFixed(6)}',
            style: TextStyle(
              fontSize: 12,
              color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
              fontFamily: 'Outfit',
            ),
          ),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: AppColors.accent.withOpacity(0.12),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Text(
              'Interactive Maps Unavailable on Windows PC Client',
              style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.accent, fontFamily: 'Outfit'),
            ),
          )
        ],
      ),
    );
  }

  /**
   * Premium chronological timeline stepper representing audit log transitions
   */
  Widget _buildTimelineStepper(List<StatusLogModel> timeline, bool isDark) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Icon(Icons.alt_route_rounded, color: AppColors.accent, size: 20),
            const SizedBox(width: 6),
            Text(
              'Audit Logs & Timeline',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                fontFamily: 'Outfit',
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        if (timeline.isEmpty)
          Container(
            padding: const EdgeInsets.all(AppSpacing.md),
            width: double.infinity,
            decoration: BoxDecoration(
              color: isDark ? AppColors.surfaceDark : Colors.grey.shade50,
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Center(
              child: Text(
                'Timeline details initialization pending...',
                style: TextStyle(fontStyle: FontStyle.italic, fontSize: 13, fontFamily: 'Outfit'),
              ),
            ),
          )
        else
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: timeline.length,
            itemBuilder: (context, index) {
              final log = timeline[index];
              final isLast = index == timeline.length - 1;
              final statusColor = _getStatusColor(log.newStatus);
              final timeString = DateFormat('hh:mm a • MMM dd, yyyy').format(log.createdAt);

              return Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Chronological connecting vertical line and status bubble dots
                  Column(
                    children: [
                      Container(
                        width: 24,
                        height: 24,
                        decoration: BoxDecoration(
                          color: statusColor.withOpacity(0.12),
                          shape: BoxShape.circle,
                          border: Border.all(color: statusColor, width: 2),
                        ),
                        child: Center(
                          child: Icon(
                            _getStatusIcon(log.newStatus),
                            size: 12,
                            color: statusColor,
                          ),
                        ),
                      ),
                      if (!isLast)
                        Container(
                          width: 2,
                          height: 65,
                          color: isDark ? AppColors.borderDark : AppColors.borderLight,
                        ),
                    ],
                  ),
                  const SizedBox(width: AppSpacing.md),

                  // Event Description Card
                  Expanded(
                    child: Container(
                      margin: const EdgeInsets.only(bottom: 16),
                      padding: const EdgeInsets.all(AppSpacing.md),
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.surfaceDark : Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: isDark ? AppColors.borderDark : AppColors.borderLight,
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                log.newStatus,
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.bold,
                                  color: statusColor,
                                  fontFamily: 'Outfit',
                                ),
                              ),
                              Text(
                                log.changedByRole.toUpperCase(),
                                style: TextStyle(
                                  fontSize: 9,
                                  fontWeight: FontWeight.bold,
                                  letterSpacing: 0.5,
                                  color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                                  fontFamily: 'Outfit',
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Text(
                            timeString,
                            style: TextStyle(
                              fontSize: 11,
                              color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                              fontFamily: 'Outfit',
                            ),
                          ),
                          if (log.remarks.isNotEmpty) ...[
                            const SizedBox(height: 8),
                            Text(
                              log.remarks,
                              style: TextStyle(
                                fontSize: 13,
                                color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                                fontFamily: 'Outfit',
                                fontStyle: FontStyle.italic,
                              ),
                            ),
                          ],
                          const SizedBox(height: 6),
                          Text(
                            'Transition: ${log.previousStatus} ➜ ${log.newStatus}',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              color: isDark ? Colors.grey.shade600 : Colors.grey.shade400,
                              fontFamily: 'Outfit',
                            ),
                          )
                        ],
                      ),
                    ),
                  ),
                ],
              );
            },
          ),
      ],
    );
  }

  /**
   * Detailed skeleton cards shown while loading details screen properties
   */
  Widget _buildSkeletonLoader(bool isDark) {
    return Padding(
      padding: const EdgeInsets.all(AppSpacing.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            height: 180,
            width: double.infinity,
            decoration: BoxDecoration(
              color: isDark ? AppColors.surfaceDark : Colors.grey.shade200,
              borderRadius: BorderRadius.circular(16),
            ),
          ),
          const SizedBox(height: 24),
          Container(
            width: 100,
            height: 20,
            color: isDark ? AppColors.surfaceDark : Colors.grey.shade200,
          ),
          const SizedBox(height: 8),
          Container(
            width: 240,
            height: 28,
            color: isDark ? AppColors.surfaceDark : Colors.grey.shade200,
          ),
          const SizedBox(height: 12),
          Container(
            width: double.infinity,
            height: 14,
            color: isDark ? AppColors.surfaceDark : Colors.grey.shade200,
          ),
          const SizedBox(height: 6),
          Container(
            width: 180,
            height: 14,
            color: isDark ? AppColors.surfaceDark : Colors.grey.shade200,
          ),
          const SizedBox(height: 32),
          Container(
            width: 140,
            height: 20,
            color: isDark ? AppColors.surfaceDark : Colors.grey.shade200,
          ),
          const SizedBox(height: 12),
          Container(
            width: double.infinity,
            height: 100,
            decoration: BoxDecoration(
              color: isDark ? AppColors.surfaceDark : Colors.grey.shade200,
              borderRadius: BorderRadius.circular(16),
            ),
          ),
        ],
      ),
    );
  }

  // Formatting helpers mapping status logs to visual colors and icon widgets
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

  IconData _getStatusIcon(String status) {
    switch (status.toLowerCase()) {
      case 'submitted':
        return Icons.assignment_outlined;
      case 'under review':
      case 'under_review':
        return Icons.rate_review_outlined;
      case 'assigned':
        return Icons.person_add_alt_outlined;
      case 'in progress':
      case 'in_progress':
        return Icons.trending_up_outlined;
      case 'resolved':
        return Icons.check_circle_outline_rounded;
      case 'rejected':
        return Icons.cancel_outlined;
      default:
        return Icons.help_outline_rounded;
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
