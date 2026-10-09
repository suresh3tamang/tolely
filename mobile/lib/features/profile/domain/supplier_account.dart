/// A service provider's account (the `suppliers` document).
class SupplierAccount {
  const SupplierAccount({
    required this.name,
    required this.phone,
    required this.area,
    required this.services,
    required this.verified,
    this.online = true,
    this.vehicleNo = '',
    this.waterSource = '',
    this.ratingSum = 0,
    this.ratingCount = 0,
    this.completedJobs = 0,
    this.feeBalance = 0,
  });

  factory SupplierAccount.fromJson(Map<String, dynamic> json) => SupplierAccount(
    name: json['name'] as String? ?? '',
    phone: json['phone'] as String? ?? '',
    area: json['area'] as String? ?? '',
    services: List<String>.from(json['services'] as List? ?? const []),
    verified: json['verified'] == true,
    // Suppliers are online unless they switched themselves off.
    online: json['online'] != false,
    vehicleNo: json['vehicleNo'] as String? ?? '',
    waterSource: json['waterSource'] as String? ?? '',
    ratingSum: (json['ratingSum'] as num?)?.toDouble() ?? 0,
    ratingCount: (json['ratingCount'] as num?)?.toInt() ?? 0,
    completedJobs: (json['completedJobs'] as num?)?.toInt() ?? 0,
    feeBalance: (json['feeBalance'] as num?)?.toInt() ?? 0,
  );

  final String name;
  final String phone;
  final String area;

  /// Keys of the services this supplier offers (e.g. `tanker`, `plumber`).
  final List<String> services;

  /// Approved by an admin. Unverified suppliers cannot take jobs.
  final bool verified;
  final bool online;
  final String vehicleNo;
  final String waterSource;
  final double ratingSum;
  final int ratingCount;
  final int completedJobs;

  /// Platform fees the supplier still owes Tolely (customers pay them directly).
  final int feeBalance;

  double? get averageRating => ratingCount == 0 ? null : ratingSum / ratingCount;

  /// Topics for new-job push alerts: only verified, online suppliers get them.
  List<String> get alertServices => verified && online ? services : const [];
}
