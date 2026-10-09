enum UserRole {
  customer,
  supplier,
  admin;

  static UserRole? fromWire(String? value) {
    for (final role in values) {
      if (role.name == value) return role;
    }
    return null;
  }
}

/// The signed-in person's profile (the `users` document).
class UserProfile {
  const UserProfile({
    required this.uid,
    required this.role,
    required this.name,
    this.address = '',
    this.landmark = '',
    this.language,
    this.phone,
  });

  factory UserProfile.fromJson(Map<String, dynamic> json) => UserProfile(
    uid: json['uid'] as String? ?? '',
    role: UserRole.fromWire(json['role'] as String?),
    name: json['name'] as String? ?? '',
    address: json['address'] as String? ?? '',
    landmark: json['landmark'] as String? ?? '',
    language: json['language'] as String?,
    phone: json['phone'] as String?,
  );

  final String uid;

  /// Null until the person finishes choosing "customer" or "supplier".
  final UserRole? role;
  final String name;
  final String address;
  final String landmark;

  /// Preferred language code ('ne' / 'en'), also used for push notifications.
  final String? language;
  final String? phone;

  String get firstName => name.trim().split(RegExp(r'\s+')).first;
}
