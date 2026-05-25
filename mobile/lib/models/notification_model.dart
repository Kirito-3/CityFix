import 'package:flutter/material.dart';

/**
 * Model class detailing User alert notifications
 */
class NotificationModel {
  final String id;
  final String recipientId;
  final String title;
  final String message;
  final String type;
  final bool isRead;
  final DateTime createdAt;

  NotificationModel({
    required this.id,
    required this.recipientId,
    required this.title,
    required this.message,
    required this.type,
    required this.isRead,
    required this.createdAt,
  });

  /**
   * Translates incoming REST JSON maps into type-safe NotificationModel objects.
   */
  factory NotificationModel.fromJson(Map<String, dynamic> json) {
    return NotificationModel(
      id: json['_id'] ?? json['id'] ?? '',
      recipientId: json['recipient'] ?? '',
      title: json['title'] ?? '',
      message: json['message'] ?? '',
      type: json['type'] ?? 'general',
      isRead: json['isRead'] ?? false,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'])
          : DateTime.now(),
    );
  }

  /**
   * Helper that returns a thematic icon mapping for the notification category
   */
  IconData get icon {
    switch (type.toLowerCase()) {
      case 'complaint_status':
        return Icons.construction_rounded;
      case 'assignment':
        return Icons.assignment_ind_outlined;
      case 'broadcast':
        return Icons.campaign_outlined;
      case 'general':
      default:
        return Icons.notifications_none_rounded;
    }
  }

  /**
   * Helper that returns a matching accent color for the notification category
   */
  Color get color {
    switch (type.toLowerCase()) {
      case 'complaint_status':
        return const Color(0xFF0D9488); // Sleek Teal accent
      case 'assignment':
        return const Color(0xFFF59E0B); // Amber warning accent
      case 'broadcast':
        return const Color(0xFFEF4444); // Crimson error accent
      case 'general':
      default:
        return const Color(0xFF3B82F6); // Soft blue info accent
    }
  }
}
