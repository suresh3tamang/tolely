import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:latlong2/latlong.dart';
import 'package:mocktail/mocktail.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:tolely/app/app.dart';
import 'package:tolely/core/l10n/l10n.dart';
import 'package:tolely/core/l10n/locale_controller.dart';
import 'package:tolely/core/services/location_service.dart';
import 'package:tolely/core/services/push_service.dart';
import 'package:tolely/features/auth/data/auth_repository.dart';
import 'package:tolely/features/booking/data/booking_repository.dart';
import 'package:tolely/features/booking/domain/booking.dart';
import 'package:tolely/features/catalog/data/catalog_repository.dart';
import 'package:tolely/features/catalog/domain/service.dart';
import 'package:tolely/features/profile/data/profile_repository.dart';
import 'package:tolely/features/profile/domain/user_profile.dart';
import 'package:tolely/features/supplier/data/supplier_repository.dart';

class MockAuth extends Mock implements AuthRepository {}

class MockBookings extends Mock implements BookingRepository {}

class MockCatalog extends Mock implements CatalogRepository {}

class MockProfile extends Mock implements ProfileRepository {}

class MockSuppliers extends Mock implements SupplierRepository {}

class MockPush extends Mock implements PushService {}

/// A push service that remembers the "open this booking" handler given to it.
class SpyPush extends MockPush {
  void Function(String bookingId)? handler;

  @override
  set onOpenBooking(void Function(String bookingId)? value) => handler = value;

  @override
  void Function(String bookingId)? get onOpenBooking => handler;
}

class MockLocation extends Mock implements LocationService {}

/// Fake data sources for screen tests. Screens read these through Provider,
/// exactly like the real app, so wiring mistakes show up here.
class Fakes {
  Fakes() {
    // mocktail needs a stand-in value for each argument type used with `any()`.
    registerFallbackValue(BookingStatus.pending);
    registerFallbackValue(false);
    registerFallbackValue(const LatLng(0, 0));
    registerFallbackValue(
      NewBooking(
        serviceKey: 'x',
        optionId: 'x',
        address: 'x',
        scheduledFor: DateTime(2026),
        paymentMethod: PaymentMethod.cash,
      ),
    );
    when(() => auth.currentUid).thenReturn('u1');
    when(() => auth.phoneNumber).thenReturn('+9779800000001');
    when(
      () => push.start(
        supplierServices: any(named: 'supplierServices'),
        ask: any(named: 'ask'),
      ),
    ).thenAnswer((_) async {});
    when(() => push.stop()).thenAnswer((_) async {});
    when(() => catalog.services()).thenAnswer((_) async => services);
    when(() => bookings.watchCustomerBookings(any(), limit: any(named: 'limit')))
        .thenAnswer((_) => Stream.value(const []));
    when(() => bookings.watchOpenJobs(limit: any(named: 'limit'))).thenAnswer((_) => Stream.value(const []));
    when(() => bookings.watchSupplierJobs(any(), limit: any(named: 'limit'))).thenAnswer((_) => Stream.value(const []));
    when(() => bookings.watchCompletedJobs(any(), limit: any(named: 'limit')))
        .thenAnswer((_) => Stream.value(const []));
    when(() => bookings.watchOnTheWayJobIds(any())).thenAnswer((_) => Stream.value(const []));
    when(() => bookings.lastPickedLocation).thenReturn(null);
  }

  final auth = MockAuth();
  final bookings = MockBookings();
  final catalog = MockCatalog();
  final profile = MockProfile();
  final suppliers = MockSuppliers();
  final push = SpyPush();
  final location = MockLocation();

  List<Service> services = [tanker, plumber];
}

const tanker = Service(
  key: 'tanker',
  name: LocalizedText({'en': 'Water Tanker', 'ne': 'पानी ट्याङ्कर'}),
  icon: 'water_drop',
  options: [
    ServiceOption(id: '8000L', label: LocalizedText({'en': '8,000 Liters', 'ne': '८,००० लिटर'}), price: 3200),
    ServiceOption(id: '6000L', label: LocalizedText({'en': '6,000 Liters', 'ne': '६,००० लिटर'}), price: 2500),
  ],
);

const plumber = Service(
  key: 'plumber',
  name: LocalizedText({'en': 'Plumber', 'ne': 'प्लम्बर'}),
  icon: 'plumbing',
  options: [
    ServiceOption(id: 'visit', label: LocalizedText({'en': 'Visit', 'ne': 'भ्रमण'}), price: 500),
  ],
);

const customerProfile = UserProfile(
  uid: 'u1',
  role: UserRole.customer,
  name: 'Suresh Tamang',
  address: 'Balkot, Bhaktapur',
  landmark: 'Near the temple',
);

Booking booking({
  String id = 'b1',
  BookingStatus status = BookingStatus.pending,
  String serviceKey = 'tanker',
  int price = 3200,
  String? supplierName,
  int? rating,
  LatLng? location,
  double feePercent = 0,
  double? supplierRating,
  int supplierRatingCount = 0,
  int supplierJobs = 0,
  DateTime? scheduledFor,
}) => Booking(
  id: id,
  status: status,
  serviceKey: serviceKey,
  serviceName: const LocalizedText({'en': 'Water Tanker', 'ne': 'पानी ट्याङ्कर'}),
  optionLabel: const LocalizedText({'en': '8,000 Liters', 'ne': '८,००० लिटर'}),
  optionId: '8000L',
  price: price,
  address: 'Balkot, Bhaktapur',
  scheduledFor: scheduledFor ?? DateTime(2026, 10, 12, 10),
  paymentMethod: PaymentMethod.cash,
  customerName: 'Suresh Tamang',
  customerPhone: '+9779800000001',
  supplierName: supplierName,
  rating: rating,
  location: location,
  platformFeePercent: feePercent,
  supplierRating: supplierRating,
  supplierRatingCount: supplierRatingCount,
  supplierJobs: supplierJobs,
);

/// Shows [home] inside the real app shell (theme, translations, providers).
Future<LocaleController> pumpScreen(WidgetTester tester, Widget home, Fakes fakes, {String language = 'ne'}) async {
  SharedPreferences.setMockInitialValues({'language': language});
  final locale = await LocaleController.load();
  await tester.binding.setSurfaceSize(const Size(430, 932));
  addTearDown(() => tester.binding.setSurfaceSize(null));
  await tester.pumpWidget(
    MultiProvider(
      providers: [
        Provider<AuthRepository>.value(value: fakes.auth),
        Provider<BookingRepository>.value(value: fakes.bookings),
        Provider<CatalogRepository>.value(value: fakes.catalog),
        Provider<ProfileRepository>.value(value: fakes.profile),
        Provider<SupplierRepository>.value(value: fakes.suppliers),
        Provider<PushService>.value(value: fakes.push),
        Provider<LocationService>.value(value: fakes.location),
        ChangeNotifierProvider<LocaleController>.value(value: locale),
      ],
      child: TolelyApp(home: home),
    ),
  );
  await tester.pumpAndSettle();
  return locale;
}
