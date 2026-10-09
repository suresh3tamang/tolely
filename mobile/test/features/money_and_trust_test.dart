import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:tolely/core/services/push_service.dart';
import 'package:tolely/features/auth/presentation/session_gate.dart';
import 'package:tolely/features/booking/domain/booking.dart';
import 'package:tolely/features/booking/presentation/booking_detail_screen.dart';
import 'package:tolely/features/profile/domain/session.dart';
import 'package:tolely/features/profile/domain/supplier_account.dart';
import 'package:tolely/features/profile/domain/user_profile.dart';
import 'package:tolely/features/profile/presentation/supplier_profile_tab.dart';
import 'package:tolely/features/supplier/presentation/job_card.dart';

import '../helpers/pump_app.dart';

void main() {
  late Fakes fakes;
  setUp(() => fakes = Fakes());

  group('platform fee maths (must match web/src/server/bookings/fees.ts)', () {
    // The same cases as web/tests/unit/fees.test.ts.
    test('no fee: the supplier keeps everything', () {
      final b = booking(price: 3200);
      expect(b.platformFee, 0);
      expect(b.supplierEarning, 3200);
    });

    test('percentage of the price, rounded to the nearest rupee', () {
      expect(booking(price: 3200, feePercent: 8).platformFee, 256);
      expect(booking(price: 3200, feePercent: 8).supplierEarning, 2944);
      expect(booking(price: 2500, feePercent: 7.5).platformFee, 188); // 187.5
      expect(booking(price: 1500, feePercent: 8.5).platformFee, 128); // 127.5
    });

    test('fee plus earning always equal the price', () {
      for (final price in [500, 1200, 1500, 2500, 3200, 4500, 8000]) {
        for (final percent in [0.0, 0.5, 5.0, 7.5, 8.0, 10.0, 12.5, 30.0]) {
          final b = booking(price: price, feePercent: percent);
          expect(b.platformFee + b.supplierEarning, price, reason: '$price @ $percent%');
        }
      }
    });

    test('the fee recorded by the server wins once the job is done', () {
      final b = Booking.fromMap('b1', {
        'status': 'completed',
        'price': 3200,
        'platformFeePercent': 8,
        'platformFee': 300,
      });
      expect(b.platformFee, 300);
      expect(b.supplierEarning, 2900);
    });

    test('old bookings without a fee field count as no fee', () {
      final b = Booking.fromMap('old', {'status': 'completed', 'price': 3200});
      expect(b.platformFee, 0);
    });
  });

  group('what the supplier sees', () {
    testWidgets('a job card shows what they will earn after the fee', (tester) async {
      await pumpScreen(tester, Scaffold(body: JobCard(booking(feePercent: 8))), fakes, language: 'en');
      expect(find.textContaining('You earn Rs 2,944', findRichText: true), findsOneWidget);
      expect(find.textContaining('after Tolely fee Rs 256', findRichText: true), findsOneWidget);
    });

    testWidgets('nothing about fees is shown while the fee is off', (tester) async {
      await pumpScreen(tester, Scaffold(body: JobCard(booking())), fakes, language: 'en');
      expect(find.textContaining('You earn', findRichText: true), findsNothing);
      expect(find.textContaining('fee', findRichText: true), findsNothing);
    });

    testWidgets('the fee line is translated', (tester) async {
      await pumpScreen(tester, Scaffold(body: JobCard(booking(feePercent: 8))), fakes);
      expect(find.textContaining('तपाईंको कमाइ Rs 2,944', findRichText: true), findsOneWidget);
    });

    testWidgets('the Me tab shows earnings after the fee and what is owed to Tolely', (tester) async {
      when(() => fakes.bookings.watchCompletedJobs(any(), limit: any(named: 'limit'))).thenAnswer(
        (_) => Stream.value([
          booking(status: BookingStatus.completed, price: 3200, feePercent: 8, scheduledFor: DateTime.now()),
        ]),
      );
      const supplier = SupplierAccount(
        name: 'Hari',
        phone: '+977',
        area: 'Thimi',
        services: ['tanker'],
        verified: true,
        feeBalance: 256,
      );
      await pumpScreen(
        tester,
        Scaffold(
          body: SupplierProfileTab(supplier: supplier, onEdit: () {}),
        ),
        fakes,
        language: 'en',
      );

      // The job is dated today, so "this month" and "total" both show the supplier's share.
      expect(find.text('Rs 2,944'), findsNWidgets(2));
      expect(find.textContaining('Owed to Tolely: Rs 256'), findsOneWidget);
    });

    testWidgets('no "owed" card when nothing is owed', (tester) async {
      const supplier = SupplierAccount(
        name: 'Hari',
        phone: '+977',
        area: 'Thimi',
        services: ['tanker'],
        verified: true,
      );
      await pumpScreen(
        tester,
        Scaffold(
          body: SupplierProfileTab(supplier: supplier, onEdit: () {}),
        ),
        fakes,
        language: 'en',
      );
      expect(find.textContaining('Owed to Tolely'), findsNothing);
    });
  });

  group('what the customer sees about their supplier', () {
    Future<void> showDetail(WidgetTester tester, Booking b, {String language = 'en'}) {
      when(() => fakes.bookings.watchBooking(b.id)).thenAnswer((_) => Stream.value(b));
      return pumpScreen(tester, BookingDetailScreen(bookingId: b.id, asSupplier: false), fakes, language: language);
    }

    testWidgets('rating, number of ratings and jobs done', (tester) async {
      await showDetail(
        tester,
        booking(
          status: BookingStatus.accepted,
          supplierName: 'Hari',
          supplierRating: 4.6,
          supplierRatingCount: 5,
          supplierJobs: 12,
        ),
      );
      expect(find.text('Hari'), findsOneWidget);
      expect(find.text('4.6 (5) · 12 jobs'), findsOneWidget);
      expect(find.byIcon(Icons.verified), findsOneWidget);
    });

    testWidgets('a new supplier is shown as new, and "1 job" is singular', (tester) async {
      await showDetail(tester, booking(status: BookingStatus.accepted, supplierName: 'Hari'));
      expect(find.text('New supplier'), findsOneWidget);

      await showDetail(
        tester,
        booking(id: 'b2', status: BookingStatus.accepted, supplierName: 'Sita', supplierJobs: 1),
      );
      expect(find.text('New supplier · 1 job'), findsOneWidget);
    });

    testWidgets('the customer never sees the platform fee', (tester) async {
      await showDetail(tester, booking(status: BookingStatus.accepted, supplierName: 'Hari', feePercent: 8));
      expect(find.textContaining('fee', findRichText: true), findsNothing);
      expect(find.textContaining('You earn', findRichText: true), findsNothing);
    });
  });

  group('tapping a notification', () {
    test('finds the booking id in the message', () {
      expect(PushService.bookingIdOf(const RemoteMessage(data: {'bookingId': 'b9'})), 'b9');
      expect(PushService.bookingIdOf(const RemoteMessage(data: {})), isNull);
      expect(PushService.bookingIdOf(const RemoteMessage(data: {'bookingId': ''})), isNull);
    });

    test('opens the booking, and ignores messages without one', () {
      final opened = <String>[];
      final push = PushService(registerDevice: (_, {remove = false}) async {})..onOpenBooking = opened.add;

      push.handleOpened(const RemoteMessage(data: {'bookingId': 'b9'}));
      push.handleOpened(const RemoteMessage(data: {'other': 'x'}));

      expect(opened, ['b9']);
    });

    testWidgets('after login, a tapped notification opens that booking as a customer', (tester) async {
      when(() => fakes.profile.session()).thenAnswer((_) async => const Session(user: customerProfile));
      when(() => fakes.bookings.watchBooking('b7')).thenAnswer((_) => Stream.value(booking(id: 'b7')));
      await pumpScreen(tester, const SessionGate(), fakes, language: 'en');

      expect(fakes.push.handler, isNotNull);
      fakes.push.handler!('b7');
      await tester.pumpAndSettle();

      expect(find.byType(BookingDetailScreen), findsOneWidget);
      expect(find.text('Booking details'), findsOneWidget);
    });

    testWidgets('a supplier is taken to the supplier view of the job', (tester) async {
      when(() => fakes.auth.currentUid).thenReturn('sup1');
      when(() => fakes.profile.session()).thenAnswer(
        (_) async => const Session(
          user: UserProfile(uid: 'sup1', role: UserRole.supplier, name: 'Hari'),
          supplier: SupplierAccount(name: 'Hari', phone: '+977', area: 'Thimi', services: ['tanker'], verified: true),
        ),
      );
      when(() => fakes.bookings.watchBooking('b7'))
          .thenAnswer((_) => Stream.value(booking(id: 'b7', status: BookingStatus.accepted, supplierName: 'Hari')));
      await pumpScreen(tester, const SessionGate(), fakes, language: 'en');

      fakes.push.handler!('b7');
      await tester.pumpAndSettle();

      // The supplier view shows the customer, not the supplier trust line.
      expect(find.text('Customer · '), findsNothing);
      expect(find.text('New supplier'), findsNothing);
      expect(find.text('Suresh Tamang'), findsOneWidget);
    });
  });
}
