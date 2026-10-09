import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:latlong2/latlong.dart';
import 'package:tolely/core/l10n/localized_text.dart';
import 'package:tolely/core/utils/geo.dart';

/// Where a booking is in its life. The wire names match the server.
enum BookingStatus {
  pending('pending'),
  accepted('accepted'),
  onTheWay('on_the_way'),
  completed('completed'),
  cancelled('cancelled');

  const BookingStatus(this.wire);

  final String wire;

  /// A job that still needs action (not finished or cancelled).
  bool get isOpen => this == pending || this == accepted || this == onTheWay;

  static BookingStatus fromWire(String? value) =>
      BookingStatus.values.firstWhere((s) => s.wire == value, orElse: () => BookingStatus.pending);
}

enum PaymentMethod {
  cash('cash'),
  qr('qr');

  const PaymentMethod(this.wire);

  final String wire;

  static PaymentMethod fromWire(String? value) =>
      PaymentMethod.values.firstWhere((m) => m.wire == value, orElse: () => PaymentMethod.cash);
}

/// A customer's request for a service, as stored in Firestore.
class Booking {
  const Booking({
    required this.id,
    required this.status,
    required this.serviceKey,
    required this.serviceName,
    required this.optionLabel,
    required this.price,
    required this.address,
    required this.scheduledFor,
    required this.paymentMethod,
    this.optionId,
    this.landmark = '',
    this.note = '',
    this.scheduledEnd,
    this.contactName,
    this.contactPhone,
    this.customerName,
    this.customerPhone,
    this.supplierName,
    this.supplierPhone,
    this.vehicleNo,
    this.rating,
    this.platformFeePercent = 0,
    this.recordedFee,
    this.supplierRating,
    this.supplierRatingCount = 0,
    this.supplierJobs = 0,
    this.location,
    this.supplierLocation,
    this.createdAt,
    this.acceptedAt,
    this.departedAt,
    this.arrivedAt,
    this.lateByMinutes,
    this.supplierLocationAt,
    this.completedAt,
    this.cancelledAt,
  });

  factory Booking.fromDoc(DocumentSnapshot<Map<String, dynamic>> doc) => Booking.fromMap(doc.id, doc.data()!);

  factory Booking.fromMap(String id, Map<String, dynamic> m) {
    DateTime? time(String field) {
      final value = m[field];
      return value is Timestamp ? value.toDate() : null;
    }

    return Booking(
      id: id,
      status: BookingStatus.fromWire(m['status'] as String?),
      serviceKey: m['serviceKey'] as String? ?? '',
      serviceName: LocalizedText.fromFields(m, 'serviceName'),
      optionLabel: LocalizedText.fromFields(m, 'optionLabel'),
      optionId: m['optionId'] as String?,
      price: (m['price'] as num?)?.toInt() ?? 0,
      address: m['address'] as String? ?? '',
      landmark: m['landmark'] as String? ?? '',
      note: m['note'] as String? ?? '',
      paymentMethod: PaymentMethod.fromWire(m['paymentMethod'] as String?),
      scheduledFor: time('scheduledFor') ?? DateTime.fromMillisecondsSinceEpoch(0),
      scheduledEnd: time('scheduledEnd'),
      contactName: m['contactName'] as String?,
      contactPhone: m['contactPhone'] as String?,
      customerName: m['customerName'] as String?,
      customerPhone: m['customerPhone'] as String?,
      supplierName: m['supplierName'] as String?,
      supplierPhone: m['supplierPhone'] as String?,
      vehicleNo: m['vehicleNo'] as String?,
      rating: (m['rating'] as num?)?.toInt(),
      platformFeePercent: (m['platformFeePercent'] as num?)?.toDouble() ?? 0,
      recordedFee: (m['platformFee'] as num?)?.toInt(),
      supplierRating: (m['supplierRating'] as num?)?.toDouble(),
      supplierRatingCount: (m['supplierRatingCount'] as num?)?.toInt() ?? 0,
      supplierJobs: (m['supplierJobs'] as num?)?.toInt() ?? 0,
      location: latLngFromJson(m['location']),
      supplierLocation: latLngFromJson(m['supplierLocation']),
      createdAt: time('createdAt'),
      acceptedAt: time('acceptedAt'),
      departedAt: time('departedAt'),
      arrivedAt: time('arrivedAt'),
      lateByMinutes: (m['lateByMinutes'] as num?)?.toInt(),
      supplierLocationAt: switch (m['supplierLocation']) {
        {'at': final Timestamp at} => at.toDate(),
        _ => null,
      },
      completedAt: time('completedAt'),
      cancelledAt: time('cancelledAt'),
    );
  }

  final String id;
  final BookingStatus status;
  final String serviceKey;
  final LocalizedText serviceName;
  final LocalizedText optionLabel;
  final String? optionId;
  final int price;
  final String address;
  final String landmark;
  final String note;
  final PaymentMethod paymentMethod;
  final DateTime scheduledFor;
  /// End of the time window the customer chose (null for older bookings with a single time).
  final DateTime? scheduledEnd;

  /// Who to ask for and which number to call; may differ from the account holder.
  final String? contactName;
  final String? contactPhone;
  final String? customerName;
  final String? customerPhone;

  /// What a supplier should call and say: the booked contact, else the account holder.
  String? get callName => (contactName?.isNotEmpty ?? false) ? contactName : customerName;
  String? get callPhone => (contactPhone?.isNotEmpty ?? false) ? contactPhone : customerPhone;
  final String? supplierName;
  final String? supplierPhone;
  final String? vehicleNo;
  final int? rating;

  /// The share of the price Tolely keeps, frozen when the booking was made.
  final double platformFeePercent;

  /// The fee as recorded by the server when the job was completed.
  final int? recordedFee;

  /// What the customer sees about their supplier (a snapshot at acceptance).
  final double? supplierRating;
  final int supplierRatingCount;
  final int supplierJobs;

  /// The customer's pin on the map, if they set one.
  final LatLng? location;

  /// Live position of the supplier; only present while on the way.
  final LatLng? supplierLocation;
  final DateTime? createdAt;
  final DateTime? acceptedAt;
  /// When the supplier said they had arrived (still on the way until they mark the job done).
  final DateTime? arrivedAt;

  /// The supplier said they would be this many minutes late.
  final int? lateByMinutes;

  /// When [supplierLocation] was last updated.
  final DateTime? supplierLocationAt;
  final DateTime? departedAt;
  final DateTime? completedAt;
  final DateTime? cancelledAt;

  bool get isOpen => status.isOpen;

  /// Tolely's fee in whole rupees. Uses the same formula as the server
  /// (`computeFee` in web/src/server/bookings/fees.ts): rounded to the nearest rupee.
  int get platformFee => recordedFee ?? (platformFeePercent > 0 ? (price * platformFeePercent / 100).round() : 0);

  /// What the supplier keeps.
  int get supplierEarning => price - platformFee;
}
