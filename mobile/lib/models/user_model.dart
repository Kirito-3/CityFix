/**
 * Model class detailing User profile elements and serialization maps
 */
class UserModel {
  final String id;
  final String name;
  final String email;
  final String role;
  final String phone;
  final String profilePicture;

  UserModel({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    required this.phone,
    this.profilePicture = '',
  });

  /**
   * Translates incoming REST JSON maps into type-safe UserModel objects.
   */
  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['_id'] ?? json['id'] ?? '',
      name: json['name'] ?? '',
      email: json['email'] ?? '',
      role: json['role'] ?? 'citizen',
      phone: json['phone'] ?? '',
      profilePicture: json['profilePicture'] ?? '',
    );
  }

  /**
   * Serializes UserModel into JSON map collections for REST posts.
   */
  Map<String, dynamic> toJson() {
    return {
      '_id': id,
      'name': name,
      'email': email,
      'role': role,
      'phone': phone,
      'profilePicture': profilePicture,
    };
  }
}
