import 'user_model.dart';

/**
 * Model class detailing civic Complaint records and GeoJSON locations
 */
class ComplaintModel {
  final String id;
  final String title;
  final String description;
  final String category;
  final String status;
  final String priority;
  final double longitude;
  final double latitude;
  final String address;
  final UserModel? citizen;
  final UserModel? assignedAuthority;
  final List<String> images;
  final DateTime createdAt;
  final DateTime updatedAt;

  ComplaintModel({
    required this.id,
    required this.title,
    required this.description,
    required this.category,
    required this.status,
    required this.priority,
    required this.longitude,
    required this.latitude,
    required this.address,
    this.citizen,
    this.assignedAuthority,
    required this.images,
    required this.createdAt,
    required this.updatedAt,
  });

  /**
   * Translates incoming REST JSON maps into type-safe ComplaintModel objects.
   * Gracefully parses nested Citizen objects and GeoJSON coordinate pairs.
   */
  factory ComplaintModel.fromJson(Map<String, dynamic> json) {
    final location = json['location'] ?? {};
    final coordinates = location['coordinates'] as List<dynamic>? ?? [0.0, 0.0];
    
    // GeoJSON point coordinate order: [longitude, latitude]
    final double lng = (coordinates.isNotEmpty) ? (coordinates[0] as num).toDouble() : 0.0;
    final double lat = (coordinates.length > 1) ? (coordinates[1] as num).toDouble() : 0.0;

    return ComplaintModel(
      id: json['_id'] ?? json['id'] ?? '',
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      category: json['category'] ?? '',
      status: json['status'] ?? 'Submitted',
      priority: json['priority'] ?? 'medium',
      longitude: lng,
      latitude: lat,
      address: json['address'] ?? '',
      citizen: json['citizen'] is Map<String, dynamic>
          ? UserModel.fromJson(json['citizen'])
          : null,
      assignedAuthority: json['assignedAuthority'] is Map<String, dynamic>
          ? UserModel.fromJson(json['assignedAuthority'])
          : null,
      images: List<String>.from(json['images'] ?? []),
      createdAt: json['createdAt'] != null ? DateTime.parse(json['createdAt']) : DateTime.now(),
      updatedAt: json['updatedAt'] != null ? DateTime.parse(json['updatedAt']) : DateTime.now(),
    );
  }
}

/**
 * Model class detailing Complaint status adjustment logs (Chronological timeline details)
 */
class StatusLogModel {
  final String id;
  final String complaintId;
  final String changedByName;
  final String changedByRole;
  final String previousStatus;
  final String newStatus;
  final String remarks;
  final DateTime createdAt;

  StatusLogModel({
    required this.id,
    required this.complaintId,
    required this.changedByName,
    required this.changedByRole,
    required this.previousStatus,
    required this.newStatus,
    required this.remarks,
    required this.createdAt,
  });

  /**
   * Deserializes StatusLog timeline transitions, mapping admin author credentials.
   */
  factory StatusLogModel.fromJson(Map<String, dynamic> json) {
    final changedBy = json['changedBy'] ?? {};
    return StatusLogModel(
      id: json['_id'] ?? json['id'] ?? '',
      complaintId: json['complaint'] ?? '',
      changedByName: changedBy['name'] ?? 'System Admin',
      changedByRole: changedBy['role'] ?? 'admin',
      previousStatus: json['previousStatus'] ?? 'none',
      newStatus: json['newStatus'] ?? 'Submitted',
      remarks: json['remarks'] ?? '',
      createdAt: json['createdAt'] != null ? DateTime.parse(json['createdAt']) : DateTime.now(),
    );
  }
}
