import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:latlong2/latlong.dart';
import 'package:tolely/core/network/api_client.dart';
import 'package:tolely/core/utils/geo.dart';
import 'package:tolely/features/booking/domain/booking.dart';

/// What a customer fills in when booking. The server decides the price.
class NewBooking {
  const NewBooking({
    required this.serviceKey,
    required this.optionId,
    required this.address,
    required this.scheduledFor,
    required this.paymentMethod,
    this.landmark = '',
    this.note = '',
    this.location,
  });

  final String serviceKey;
  final String optionId;
  final String address;
  final String landmark;
  final DateTime scheduledFor;
  final PaymentMethod paymentMethod;
  final String note;
  final LatLng? location;

  Map<String, dynamic> toJson() => {
    'serviceKey': serviceKey,
    'optionId': optionId,
    'address': address,
    'landmark': landmark,
    'scheduledFor': scheduledFor.toUtc().toIso8601String(),
    'paymentMethod': paymentMethod.wire,
    'note': note,
    'location': location == null ? null : latLngToJson(location!),
  };
}

/// Bookings: live reads from Firestore (protected by security rules) and all
/// changes through the backend API, which checks roles and prices.
class BookingRepository {
  BookingRepository(this._api, [FirebaseFirestore? firestore]) : _db = firestore ?? FirebaseFirestore.instance;

  final ApiClient _api;
  final FirebaseFirestore _db;

  /// The map pin used for the customer's last booking in this session, so the
  /// next booking can start from it.
  LatLng? lastPickedLocation;

  CollectionReference<Map<String, dynamic>> get _bookings => _db.collection('bookings');

  List<Booking> _toBookings(QuerySnapshot<Map<String, dynamic>> snap) => snap.docs.map(Booking.fromDoc).toList();

  // ---- Live reads ---------------------------------------------------------

  Stream<Booking?> watchBooking(String id) =>
      _bookings.doc(id).snapshots().map((doc) => doc.exists ? Booking.fromDoc(doc) : null);

  /// A customer's bookings, newest first.
  Stream<List<Booking>> watchCustomerBookings(String uid, {int limit = 50}) => _bookings
      .where('customerId', isEqualTo: uid)
      .orderBy('createdAt', descending: true)
      .limit(limit)
      .snapshots()
      .map(_toBookings);

  /// Jobs waiting for a supplier, soonest first. Callers filter by their services.
  Stream<List<Booking>> watchOpenJobs({int limit = 100}) => _bookings
      .where('status', isEqualTo: BookingStatus.pending.wire)
      .orderBy('scheduledFor')
      .limit(limit)
      .snapshots()
      .map(_toBookings);

  /// All jobs assigned to a supplier, latest first.
  Stream<List<Booking>> watchSupplierJobs(String uid, {int limit = 100}) => _bookings
      .where('supplierId', isEqualTo: uid)
      .orderBy('scheduledFor', descending: true)
      .limit(limit)
      .snapshots()
      .map(_toBookings);

  /// A supplier's finished jobs (for earnings).
  Stream<List<Booking>> watchCompletedJobs(String uid, {int limit = 100}) => _bookings
      .where('supplierId', isEqualTo: uid)
      .where('status', isEqualTo: BookingStatus.completed.wire)
      .orderBy('scheduledFor', descending: true)
      .limit(limit)
      .snapshots()
      .map(_toBookings);

  /// Ids of the jobs a supplier is currently driving to.
  Stream<List<String>> watchOnTheWayJobIds(String uid) => _bookings
      .where('supplierId', isEqualTo: uid)
      .where('status', isEqualTo: BookingStatus.onTheWay.wire)
      .snapshots()
      .map((snap) => snap.docs.map((d) => d.id).toList());

  // ---- Customer actions ---------------------------------------------------

  Future<void> create(NewBooking booking) async {
    await _api.post('/api/bookings', booking.toJson());
    lastPickedLocation = booking.location;
  }

  Future<void> cancel(String id) => _api.post('/api/bookings/$id/cancel');

  Future<void> rate(String id, int rating) => _api.post('/api/bookings/$id/rate', {'rating': rating});

  // ---- Both sides ---------------------------------------------------------

  Future<void> reportProblem(String id, String message) => _api.post('/api/bookings/$id/report', {'message': message});

  // ---- Supplier actions ---------------------------------------------------

  Future<void> accept(String id) => _api.post('/api/bookings/$id/accept');

  /// Moves a job forward (`onTheWay`, `completed`) or releases it (`pending`).
  Future<void> setStatus(String id, BookingStatus status) =>
      _api.post('/api/bookings/$id/status', {'status': status.wire});

  /// Live position of the supplier while on the way.
  Future<void> shareLocation(String id, LatLng at) => _api.post('/api/bookings/$id/location', latLngToJson(at));
}
