import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../config/theme.dart';
import '../../providers/complaint_history_provider.dart';
import '../../models/complaint_model.dart';
import '../../widgets/foundations.dart';

/**
 * Gorgeous, Premium Civic Complaint History Listing Screen.
 * Reactively lists, filters, and paginates registered civic issues.
 */
class ComplaintHistoryScreen extends ConsumerStatefulWidget {
  const ComplaintHistoryScreen({super.key});

  @override
  ConsumerState<ComplaintHistoryScreen> createState() => _ComplaintHistoryScreenState();
}

class _ComplaintHistoryScreenState extends ConsumerState<ComplaintHistoryScreen> {
  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    // Dispatch fetch complaints list after widget mounts
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(complaintHistoryProvider.notifier).fetchHistory(isRefresh: true);
    });

    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController.removeListener(_onScroll);
    _scrollController.dispose();
    super.dispose();
  }

  /**
   * Triggers fetching subsequent pages when user scrolls to bottom.
   */
  void _onScroll() {
    if (!_scrollController.hasClients) return;
    final maxScroll = _scrollController.position.maxScrollExtent;
    final currentScroll = _scrollController.position.pixels;
    
    // Trigger fetch if scrolled to 90% of page length
    if (currentScroll >= maxScroll * 0.9) {
      ref.read(complaintHistoryProvider.notifier).fetchHistory();
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(complaintHistoryProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
      appBar: AppBar(
        title: const Text(
          'Civic Reports History',
          style: TextStyle(
            fontFamily: 'Outfit',
            fontWeight: FontWeight.bold,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.filter_list_off_rounded),
            tooltip: 'Clear Filters',
            onPressed: () {
              ref.read(complaintHistoryProvider.notifier).resetFilters();
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('All search filters cleared!'),
                  duration: Duration(seconds: 2),
                ),
              );
            },
          ),
        ],
      ),
      body: Column(
        children: [
          // 1. Sticky Category and Status filter pills panel
          _buildFilterPanel(isDark),

          // 2. Complaint feed list
          Expanded(
            child: RefreshIndicator(
              onRefresh: () async {
                await ref.read(complaintHistoryProvider.notifier).fetchHistory(isRefresh: true);
              },
              color: AppColors.accent,
              backgroundColor: isDark ? AppColors.surfaceDark : Colors.white,
              child: _buildListContent(state, isDark),
            ),
          ),
        ],
      ),
    );
  }

  /**
   * Renders the horizontal sticky filters panel
   */
  Widget _buildFilterPanel(bool isDark) {
    final state = ref.watch(complaintHistoryProvider);
    final notifier = ref.read(complaintHistoryProvider.notifier);

    const categories = ['All', 'Roads', 'Water', 'Waste', 'Electricity', 'Other'];
    const statuses = ['All', 'Submitted', 'Under Review', 'Assigned', 'In Progress', 'Resolved', 'Rejected'];
    const priorities = ['All', 'low', 'medium', 'high'];

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 10,
            offset: const Offset(0, 4),
          )
        ],
      ),
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Categories Filter Row
          _buildPillRow(
            title: 'Category',
            items: categories,
            selectedItem: state.categoryFilter ?? 'All',
            onSelected: (val) {
              notifier.setCategoryFilter(val == 'All' ? null : val);
            },
            isDark: isDark,
          ),
          const SizedBox(height: AppSpacing.xs),
          // Statuses Filter Row
          _buildPillRow(
            title: 'Status',
            items: statuses,
            selectedItem: state.statusFilter ?? 'All',
            onSelected: (val) {
              notifier.setStatusFilter(val == 'All' ? null : val);
            },
            isDark: isDark,
          ),
          const SizedBox(height: AppSpacing.xs),
          // Priorities Filter Row
          _buildPillRow(
            title: 'Priority',
            items: priorities,
            selectedItem: state.priorityFilter ?? 'All',
            onSelected: (val) {
              notifier.setPriorityFilter(val == 'All' ? null : val);
            },
            isDark: isDark,
          ),
        ],
      ),
    );
  }

  /**
   * Helper that builds an horizontally scrollable horizontal row of pill buttons
   */
  Widget _buildPillRow({
    required String title,
    required List<String> items,
    required String selectedItem,
    required Function(String) onSelected,
    required bool isDark,
  }) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
      child: Row(
        children: [
          Text(
            '$title: ',
            style: TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 12,
              color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
              fontFamily: 'Outfit',
            ),
          ),
          const SizedBox(width: 8),
          ...items.map((item) {
            final isSelected = selectedItem.toLowerCase() == item.toLowerCase();
            return Padding(
              padding: const EdgeInsets.only(right: 6),
              child: ChoiceChip(
                label: Text(
                  item == 'low' || item == 'medium' || item == 'high'
                      ? item.toUpperCase()
                      : item,
                  style: TextStyle(
                    fontSize: 12,
                    fontFamily: 'Outfit',
                    fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                    color: isSelected
                        ? Colors.white
                        : (isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight),
                  ),
                ),
                selected: isSelected,
                onSelected: (_) => onSelected(item),
                selectedColor: AppColors.accent,
                backgroundColor: isDark ? AppColors.bgDark : AppColors.bgLight,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(18),
                  side: BorderSide(
                    color: isSelected
                        ? Colors.transparent
                        : (isDark ? AppColors.borderDark : AppColors.borderLight),
                  ),
                ),
                padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 0),
                visualDensity: VisualDensity.compact,
                showCheckmark: false,
              ),
            );
          }),
        ],
      ),
    );
  }

  /**
   * Renders primary view based on loading/empty states
   */
  Widget _buildListContent(ComplaintHistoryState state, bool isDark) {
    if (state.isLoading) {
      return _buildSkeletonLoader(isDark);
    }

    if (state.errorMessage != null) {
      return CustomErrorWidget(
        message: state.errorMessage!,
        onRetry: () => ref.read(complaintHistoryProvider.notifier).fetchHistory(isRefresh: true),
      );
    }

    if (state.complaints.isEmpty) {
      return _buildEmptyState(isDark);
    }

    return ListView.builder(
      controller: _scrollController,
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(AppSpacing.md),
      itemCount: state.complaints.length + (state.isFetchingMore ? 1 : 0),
      itemBuilder: (context, index) {
        if (index == state.complaints.length) {
          return const Padding(
            padding: EdgeInsets.symmetric(vertical: 24),
            child: Center(
              child: CircularProgressIndicator(
                valueColor: AlwaysStoppedAnimation<Color>(AppColors.accent),
              ),
            ),
          );
        }

        final complaint = state.complaints[index];
        return _buildComplaintCard(complaint, isDark);
      },
    );
  }

  /**
   * Visual UI card rendering a brief summary of a single complaint
   */
  Widget _buildComplaintCard(ComplaintModel complaint, bool isDark) {
    final categoryIcon = _getCategoryIcon(complaint.category);
    final categoryColor = _getCategoryColor(complaint.category);
    final statusColor = _getStatusColor(complaint.status);
    final priorityColor = _getPriorityColor(complaint.priority);

    final dateString = DateFormat('MMM dd, yyyy • hh:mm a').format(complaint.createdAt);

    return Container(
      margin: const EdgeInsets.only(bottom: AppSpacing.md),
      decoration: BoxDecoration(
        color: isDark ? AppColors.surfaceDark : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark ? AppColors.borderDark : AppColors.borderLight,
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
            blurRadius: 8,
            offset: const Offset(0, 4),
          )
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: () {
            // Push GoRouter path to Detail screen
            context.push('/complaints/${complaint.id}');
          },
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.md),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Card Header: Category & Date
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: categoryColor.withOpacity(0.15),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        categoryIcon,
                        color: categoryColor,
                        size: 20,
                      ),
                    ),
                    const SizedBox(width: AppSpacing.sm),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            complaint.category,
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                              fontFamily: 'Outfit',
                            ),
                          ),
                          Text(
                            dateString,
                            style: TextStyle(
                              fontSize: 11,
                              color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                              fontFamily: 'Outfit',
                            ),
                          ),
                        ],
                      ),
                    ),
                    // Priority tag
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: priorityColor.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        complaint.priority.toUpperCase(),
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w900,
                          color: priorityColor,
                          letterSpacing: 0.5,
                          fontFamily: 'Outfit',
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.md),

                // Card Body: Title & Description & Image preview side-by-side
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            complaint.title,
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
                              fontFamily: 'Outfit',
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 4),
                          Text(
                            complaint.description,
                            style: TextStyle(
                              fontSize: 13,
                              color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                              fontFamily: 'Outfit',
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                    if (complaint.images.isNotEmpty) ...[
                      const SizedBox(width: AppSpacing.md),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: Image.network(
                          complaint.images.first,
                          width: 60,
                          height: 60,
                          fit: BoxFit.cover,
                          errorBuilder: (context, error, stackTrace) => Container(
                            width: 60,
                            height: 60,
                            color: isDark ? AppColors.bgDark : Colors.grey.shade100,
                            child: const Icon(
                              Icons.broken_image_outlined,
                              size: 20,
                              color: Colors.grey,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: AppSpacing.md),

                const Divider(height: 1, thickness: 0.5),
                const SizedBox(height: AppSpacing.sm),

                // Card Footer: Address & Status Badge
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    // Address indicator
                    Expanded(
                      child: Row(
                        children: [
                          Icon(
                            Icons.location_on_outlined,
                            size: 14,
                            color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
                          ),
                          const SizedBox(width: 4),
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
                        ],
                      ),
                    ),
                    const SizedBox(width: AppSpacing.md),
                    // Status badge
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: statusColor.withOpacity(0.12),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: statusColor.withOpacity(0.4),
                          width: 1,
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            width: 6,
                            height: 6,
                            decoration: BoxDecoration(
                              color: statusColor,
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 6),
                          Text(
                            complaint.status,
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: statusColor,
                              fontFamily: 'Outfit',
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  /**
   * Loading skeletons screen placeholders for professional feel
   */
  Widget _buildSkeletonLoader(bool isDark) {
    return ListView.builder(
      padding: const EdgeInsets.all(AppSpacing.md),
      itemCount: 4,
      itemBuilder: (context, index) {
        return Container(
          margin: const EdgeInsets.only(bottom: AppSpacing.md),
          height: 170,
          decoration: BoxDecoration(
            color: isDark ? AppColors.surfaceDark : Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isDark ? AppColors.borderDark : AppColors.borderLight,
              width: 1,
            ),
          ),
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.md),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    CircleAvatar(
                      radius: 18,
                      backgroundColor: isDark ? AppColors.bgDark : Colors.grey.shade200,
                    ),
                    const SizedBox(width: 8),
                    Container(
                      width: 80,
                      height: 16,
                      color: isDark ? AppColors.bgDark : Colors.grey.shade200,
                    ),
                    const Spacer(),
                    Container(
                      width: 60,
                      height: 20,
                      color: isDark ? AppColors.bgDark : Colors.grey.shade200,
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                Container(
                  width: double.infinity,
                  height: 18,
                  color: isDark ? AppColors.bgDark : Colors.grey.shade200,
                ),
                const SizedBox(height: 8),
                Container(
                  width: 200,
                  height: 14,
                  color: isDark ? AppColors.bgDark : Colors.grey.shade200,
                ),
                const Spacer(),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Container(
                      width: 140,
                      height: 12,
                      color: isDark ? AppColors.bgDark : Colors.grey.shade200,
                    ),
                    Container(
                      width: 85,
                      height: 24,
                      color: isDark ? AppColors.bgDark : Colors.grey.shade200,
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  /**
   * Visually beautiful empty state panel
   */
  Widget _buildEmptyState(bool isDark) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.article_outlined,
            size: 80,
            color: isDark ? AppColors.textSecondaryDark.withOpacity(0.3) : AppColors.textSecondaryLight.withOpacity(0.3),
          ),
          const SizedBox(height: 16),
          Text(
            'No Reports Found',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight,
              fontFamily: 'Outfit',
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Try adjusting your category or status filters.',
            style: TextStyle(
              fontSize: 14,
              color: isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight,
              fontFamily: 'Outfit',
            ),
          ),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: () {
              ref.read(complaintHistoryProvider.notifier).resetFilters();
            },
            child: const Text('Reset Search Filters'),
          ),
        ],
      ),
    );
  }

  // Visual formatting helper methods mapping properties to UI constants
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
