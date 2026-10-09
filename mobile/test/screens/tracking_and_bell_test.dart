import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:latlong2/latlong.dart';
import 'package:mocktail/mocktail.dart';
import 'package:tolely/core/l10n/localized_text.dart';
import 'package:tolely/core/utils/geo.dart';
import 'package:tolely/features/booking/domain/booking.dart';
import 'package:tolely/features/booking/presentation/booking_detail_screen.dart';
import 'package:tolely/features/booking/presentation/booking_timeline.dart';
import 'package:tolely/features/customer/presentation/customer_home.dart';
import 'package:tolely/features/notifications/domain/app_notification.dart';
import 'package:tolely/features/supplier/presentation/job_card.dart';

import '../helpers/pump_app.dart';

AppNotification note(String id, {bool seen = false, String title = 'On the way'}) => AppNotification(
  id: id,
  type: 'on_the_way',
  bookingId: 'b1',
  title: LocalizedText({'en': title, 'ne': title}),
  body: const LocalizedText({'en': 'Hari is on the way.', 'ne': 'हरि आउँदै हुनुहुन्छ।'}),
  seen: seen,
  createdAt: DateTime(2026, 10, 9, 10),
);

void main() {
  late Fakes fakes;
  setUp(() => fakes = Fakes());

  group('the bell', () {
    testWidgets('shows how many are unseen; opening the list marks them seen', (tester) async {
      when(() => fakes.notifications.watch('u1', limit: any(named: 'limit')))
          .thenAnswer((_) => Stream.value([note('n2'), note('n1', seen: true, title: 'Booking accepted')]));
      await pumpScreen(tester, const CustomerHome(profile: customerProfile), fakes, language: 'en');

      expect(find.byTooltip('Notifications (1)'), findsOneWidget);
      expect(find.text('1'), findsOneWidget); // the red badge

      await tester.tap(find.byTooltip('Notifications (1)'));
      await tester.pumpAndSettle();
      expect(find.text('On the way'), findsOneWidget);
      expect(find.text('Booking accepted'), findsOneWidget);
      verify(() => fakes.notifications.markSeen(['n2'])).called(1);
    });

    testWidgets('an empty list says so', (tester) async {
      await pumpScreen(tester, const CustomerHome(profile: customerProfile), fakes, language: 'en');
      await tester.tap(find.byTooltip('Notifications'));
      await tester.pumpAndSettle();
      expect(find.textContaining('No notifications yet'), findsOneWidget);
    });
  });

  group('the supplier tells the customer', () {
    testWidgets('"I\'ve arrived" while on the way', (tester) async {
      when(() => fakes.bookings.markArrived(any())).thenAnswer((_) async {});
      await pumpScreen(
        tester,
        Scaffold(
          body: JobCard(booking(status: BookingStatus.onTheWay, supplierName: 'Hari')),
        ),
        fakes,
        language: 'en',
      );
      await tester.tap(find.text("I've arrived"));
      await tester.pumpAndSettle();
      verify(() => fakes.bookings.markArrived('b1')).called(1);
    });

    testWidgets('"Running late" asks how late and tells the customer', (tester) async {
      when(() => fakes.bookings.reportLate(any(), any())).thenAnswer((_) async {});
      await pumpScreen(
        tester,
        Scaffold(
          body: JobCard(booking(status: BookingStatus.accepted, supplierName: 'Hari')),
        ),
        fakes,
        language: 'en',
      );
      await tester.tap(find.text('Running late'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('30 min'));
      await tester.pumpAndSettle();
      verify(() => fakes.bookings.reportLate('b1', 30)).called(1);
      expect(find.text('The customer has been told.'), findsOneWidget);
    });

    testWidgets('after arriving, the buttons change', (tester) async {
      await pumpScreen(
        tester,
        Scaffold(
          body: JobCard(booking(status: BookingStatus.onTheWay, arrivedAt: DateTime(2026, 10, 9, 11))),
        ),
        fakes,
        language: 'en',
      );
      expect(find.text("I've arrived"), findsNothing);
      expect(find.text('Running late'), findsNothing);
      expect(find.text('Arrived'), findsOneWidget);
    });
  });

  group('the customer sees', () {
    testWidgets('the arrived step in the timeline', (tester) async {
      await pumpScreen(
        tester,
        Scaffold(
          body: BookingTimeline(booking(status: BookingStatus.onTheWay, arrivedAt: DateTime(2026, 10, 9, 11))),
        ),
        fakes,
        language: 'en',
      );
      expect(find.textContaining('Arrived', findRichText: true), findsOneWidget);
      expect(find.byIcon(Icons.check_circle), findsNWidgets(4)); // booked, accepted, on the way, arrived
    });

    testWidgets('how far and about how long while on the way', (tester) async {
      const home = LatLng(27.665, 85.3667);
      const truck = LatLng(27.6786, 85.3494);
      when(() => fakes.bookings.watchBooking('b1')).thenAnswer(
        (_) => Stream.value(
          booking(status: BookingStatus.onTheWay, supplierName: 'Hari', location: home, supplierLocation: truck),
        ),
      );
      await pumpScreen(tester, const BookingDetailScreen(bookingId: 'b1', asSupplier: false), fakes, language: 'en');
      await tester.pump(const Duration(milliseconds: 100));
      expect(find.text('About ${etaMinutes(truck, home)} min away · 2.3 km'), findsOneWidget);
    });

    testWidgets('a note when the supplier is running late', (tester) async {
      when(() => fakes.bookings.watchBooking('b1')).thenAnswer(
        (_) => Stream.value(booking(status: BookingStatus.accepted, supplierName: 'Hari', lateByMinutes: 15)),
      );
      await pumpScreen(tester, const BookingDetailScreen(bookingId: 'b1', asSupplier: false), fakes, language: 'en');
      await tester.pump(const Duration(milliseconds: 100));
      expect(find.text('Running about 15 min late'), findsOneWidget);
    });
  });

  test('ETA is about 1.4 x the straight line at 18 km/h, never below a minute', () {
    expect(etaMinutes(const LatLng(27.665, 85.3667), const LatLng(27.665, 85.3667)), 1);
    final km = distanceKm(const LatLng(27.665, 85.3667), const LatLng(27.6786, 85.3494));
    expect(km, closeTo(2.3, 0.1));
    expect(etaMinutes(const LatLng(27.665, 85.3667), const LatLng(27.6786, 85.3494)), (km * 1.4 / 18 * 60).round());
  });

  test('a booking from the database', () {
    final b = Booking.fromMap('b1', {
      'status': 'on_the_way',
      'serviceKey': 'tanker',
      'arrivedAt': null,
      'lateByMinutes': 30,
    });
    expect(b.lateByMinutes, 30);
    expect(b.arrivedAt, isNull);
  });
}
