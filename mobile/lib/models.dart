import 'package:cloud_firestore/cloud_firestore.dart';

import 'i18n.dart';

class ServiceOption {
  ServiceOption({required this.id, required this.labelEn, required this.labelNe, required this.price});

  final String id;
  final String labelEn;
  final String labelNe;
  final int price;

  String get label => isNepali ? labelNe : labelEn;

  factory ServiceOption.fromJson(Map<String, dynamic> j) => ServiceOption(
        id: j['id'],
        labelEn: j['labelEn'],
        labelNe: j['labelNe'],
        price: (j['price'] as num).toInt(),
      );
}

class Service {
  Service({required this.key, required this.nameEn, required this.nameNe, required this.icon, required this.options});

  final String key;
  final String nameEn;
  final String nameNe;
  final String icon;
  final List<ServiceOption> options;

  String get name => isNepali ? nameNe : nameEn;

  factory Service.fromJson(Map<String, dynamic> j) => Service(
        key: j['key'],
        nameEn: j['nameEn'],
        nameNe: j['nameNe'],
        icon: j['icon'],
        options: (j['options'] as List).map((o) => ServiceOption.fromJson(o)).toList(),
      );
}

class Booking {
  Booking(this.id, this.data);

  final String id;
  final Map<String, dynamic> data;

  String get status => data['status'] as String;
  String get serviceName => (isNepali ? data['serviceNameNe'] : data['serviceNameEn']) as String;
  String get optionLabel => (isNepali ? data['optionLabelNe'] : data['optionLabelEn']) as String;
  int get price => (data['price'] as num).toInt();
  String get address => data['address'] as String;
  String get landmark => (data['landmark'] ?? '') as String;
  String get note => (data['note'] ?? '') as String;
  String get paymentMethod => data['paymentMethod'] as String;
  DateTime get scheduledFor => (data['scheduledFor'] as Timestamp).toDate();
  String? get customerName => data['customerName'] as String?;
  String? get customerPhone => data['customerPhone'] as String?;
  String? get supplierName => data['supplierName'] as String?;
  String? get supplierPhone => data['supplierPhone'] as String?;
  String? get vehicleNo => data['vehicleNo'] as String?;
  int? get rating => (data['rating'] as num?)?.toInt();
  String get serviceKey => data['serviceKey'] as String;

  factory Booking.fromDoc(DocumentSnapshot<Map<String, dynamic>> doc) => Booking(doc.id, doc.data()!);
}
