import 'package:tolely/features/profile/domain/supplier_account.dart';
import 'package:tolely/features/profile/domain/user_profile.dart';

/// Everything known about the signed-in person right after login.
class Session {
  const Session({this.user, this.supplier});

  factory Session.fromJson(Map<String, dynamic> json) => Session(
    user: json['user'] is Map ? UserProfile.fromJson(Map<String, dynamic>.from(json['user'] as Map)) : null,
    supplier: json['supplier'] is Map
        ? SupplierAccount.fromJson(Map<String, dynamic>.from(json['supplier'] as Map))
        : null,
  );

  /// Null when the person has not completed their profile yet.
  final UserProfile? user;
  final SupplierAccount? supplier;

  UserRole? get role => user?.role;
}
