import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:latlong2/latlong.dart';
import 'package:mocktail/mocktail.dart';
import 'package:tolely/features/booking/domain/booking.dart';
import 'package:tolely/features/profile/domain/supplier_account.dart';
import 'package:tolely/features/supplier/presentation/supplier_home.dart';

import '../helpers/pump_app.dart';

SupplierAccount supplier({bool verified = true, bool online = true, List<String> services = const ['tanker']}) =>
    SupplierAccount(
      name: 'Hari Tamang',
      phone: '+9779800000002',
      area: 'Baneshwor',
      services: services,
      verified: verified,
      online: online,
      completedJobs: 12,
      ratingSum: 23,
      ratingCount: 5,
    );

void main() {
  late Fakes fakes;

  setUp(() {
    fakes = Fakes();
    when(() => fakes.auth.currentUid).thenReturn('sup1');
  });

  testWidgets('a supplier who is not verified yet is told to wait', (tester) async {
    await pumpScreen(
      tester,
      SupplierHome(supplier: supplier(verified: false), onRefresh: () {}),
      fakes,
      language: 'en',
    );

    expect(find.text('Your account is being checked'), findsOneWidget);
    expect(find.textContaining('waiting for verification'), findsWidgets);
    expect(find.byType(Switch), findsNothing); // no online switch until verified
  });

  testWidgets('shows open jobs for the supplier\'s services, and accepts one', (tester) async {
    when(() => fakes.bookings.watchOpenJobs(limit: any(named: 'limit'))).thenAnswer(
      (_) => Stream.value([
        booking(id: 'tank1'),
        booking(id: 'plumb1', serviceKey: 'plumber'), // not offered by this supplier
      ]),
    );
    when(() => fakes.bookings.accept('tank1')).thenAnswer((_) async {});
    await pumpScreen(
      tester,
      SupplierHome(supplier: supplier(), onRefresh: () {}),
      fakes,
      language: 'en',
    );

    expect(find.text('Accept job'), findsOneWidget); // only the tanker job
    await tester.tap(find.text('Accept job'));
    await tester.pumpAndSettle();
    verify(() => fakes.bookings.accept('tank1')).called(1);
  });

  testWidgets('a job on the way: "I\'ve arrived", then "Mark completed"', (tester) async {
    when(() => fakes.bookings.watchSupplierJobs(any(), limit: any(named: 'limit')))
        .thenAnswer((_) => Stream.value([booking(status: BookingStatus.onTheWay, arrivedAt: DateTime(2026, 10, 9, 11))]));
    when(() => fakes.bookings.setStatus(any(), any())).thenAnswer((_) async {});
    await pumpScreen(tester, SupplierHome(supplier: supplier(), onRefresh: () {}), fakes, language: 'en');
    await tester.tap(find.text('My jobs'));
    await tester.pumpAndSettle();

    expect(find.text('In progress'), findsOneWidget);
    expect(find.text("I've arrived"), findsNothing); // already arrived
    await tester.tap(find.text('Mark completed'));
    await tester.pumpAndSettle();
    verify(() => fakes.bookings.setStatus('b1', BookingStatus.completed)).called(1);
  });

  testWidgets('an accepted job offers "on the way" and "release"', (tester) async {
    when(() => fakes.bookings.watchSupplierJobs(any(), limit: any(named: 'limit')))
        .thenAnswer((_) => Stream.value([booking(status: BookingStatus.accepted)]));
    when(() => fakes.bookings.setStatus(any(), any())).thenAnswer((_) async {});
    await pumpScreen(
      tester,
      SupplierHome(supplier: supplier(), onRefresh: () {}),
      fakes,
      language: 'en',
    );

    await tester.tap(find.text('My jobs'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('I am on the way'));
    await tester.pumpAndSettle();

    verify(() => fakes.bookings.setStatus('b1', BookingStatus.onTheWay)).called(1);
    expect(find.text('Release job'), findsOneWidget);
  });

  Future<void> slide(WidgetTester tester, {bool left = false}) async {
    await tester.drag(find.byKey(const ValueKey('slide-handle')), Offset(left ? -600 : 600, 0));
    await tester.pumpAndSettle();
  }

  testWidgets('slide to go offline, then slide to go online again', (tester) async {
    when(() => fakes.suppliers.setOnline(any())).thenAnswer((_) async {});
    when(() => fakes.bookings.watchOpenJobs(limit: any(named: 'limit'))).thenAnswer((_) => Stream.value([booking(id: 'tank1')]));
    var refreshed = 0;
    await pumpScreen(tester, SupplierHome(supplier: supplier(), onRefresh: () => refreshed++), fakes, language: 'en');
    expect(find.text('Slide to go offline'), findsOneWidget);
    expect(find.text('Accept job'), findsOneWidget);

    await slide(tester, left: true);
    verify(() => fakes.suppliers.setOnline(false)).called(1);
    expect(find.text("You're offline"), findsWidgets);
    expect(find.text('Accept job'), findsNothing); // jobs hide at once, without waiting for a reload
    expect(find.text('Slide to go online'), findsOneWidget);

    await slide(tester);
    verify(() => fakes.suppliers.setOnline(true)).called(1);
    expect(find.text("You're online"), findsOneWidget);
    expect(find.text('Accept job'), findsOneWidget);
    expect(refreshed, 2);
  });

  testWidgets('a short drag does nothing (no accidental changes)', (tester) async {
    await pumpScreen(tester, SupplierHome(supplier: supplier(), onRefresh: () {}), fakes, language: 'en');
    await tester.drag(find.byKey(const ValueKey('slide-handle')), const Offset(-60, 0));
    await tester.pumpAndSettle();
    verifyNever(() => fakes.suppliers.setOnline(any()));
    expect(find.text("You're online"), findsOneWidget);
  });

  testWidgets('if job alerts cannot be set up, the supplier still goes online', (tester) async {
    when(() => fakes.suppliers.setOnline(any())).thenAnswer((_) async {});
    when(() => fakes.push.start(supplierServices: any(named: 'supplierServices'), ask: any(named: 'ask')))
        .thenThrow(Exception('notifications not allowed'));
    await pumpScreen(tester, SupplierHome(supplier: supplier(online: false), onRefresh: () {}), fakes, language: 'en');
    await slide(tester);
    expect(find.text("You're online"), findsOneWidget);
  });

  testWidgets('if the server refuses, nothing changes and the reason is shown', (tester) async {
    when(() => fakes.suppliers.setOnline(any())).thenThrow(Exception('offline'));
    await pumpScreen(tester, SupplierHome(supplier: supplier(online: false), onRefresh: () {}), fakes, language: 'en');
    await slide(tester);
    expect(find.text("You're offline"), findsWidgets);
    expect(find.text('Slide to go online'), findsOneWidget);
  });

  testWidgets('an offline supplier is told to go online, and sees no jobs', (tester) async {
    when(() => fakes.bookings.watchOpenJobs(limit: any(named: 'limit'))).thenAnswer((_) => Stream.value([booking(id: 'tank1')]));
    await pumpScreen(
      tester,
      SupplierHome(supplier: supplier(online: false), onRefresh: () {}),
      fakes,
      language: 'en',
    );
    expect(find.text("You're offline"), findsWidgets);
    expect(find.text('Go online to see and accept new jobs.'), findsOneWidget);
    expect(find.text('Accept job'), findsNothing);
  });

  testWidgets('the Profile tab shows rating, jobs done and earnings', (tester) async {
    when(() => fakes.bookings.watchCompletedJobs(any(), limit: any(named: 'limit')))
        .thenAnswer((_) => Stream.value([booking(status: BookingStatus.completed, price: 3200)]));
    await pumpScreen(
      tester,
      SupplierHome(supplier: supplier(), onRefresh: () {}),
      fakes,
      language: 'en',
    );

    await tester.tap(find.text('Profile'));
    await tester.pumpAndSettle();

    expect(find.text('Hari Tamang'), findsWidgets);
    expect(find.text('12'), findsOneWidget); // jobs done
    expect(find.text('4.6'), findsOneWidget); // 23 / 5
    expect(find.text('Verified supplier'), findsOneWidget);
    expect(find.text('Log out'), findsOneWidget);
  });

  testWidgets('"Navigate" opens Google Maps to the customer, and starting the trip opens it too', (tester) async {
    const home = LatLng(27.665, 85.3667);
    when(() => fakes.bookings.watchSupplierJobs(any(), limit: any(named: 'limit')))
        .thenAnswer((_) => Stream.value([booking(status: BookingStatus.accepted, location: home)]));
    when(() => fakes.bookings.setStatus(any(), any())).thenAnswer((_) async {});
    when(() => fakes.location.openDirections(any())).thenAnswer((_) async {});
    await pumpScreen(tester, SupplierHome(supplier: supplier(), onRefresh: () {}), fakes, language: 'en');
    await tester.tap(find.text('My jobs'));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Navigate in Google Maps'));
    await tester.pumpAndSettle();
    verify(() => fakes.location.openDirections(home)).called(1);

    await tester.tap(find.text('I am on the way'));
    await tester.pumpAndSettle();
    verify(() => fakes.bookings.setStatus('b1', BookingStatus.onTheWay)).called(1);
    verify(() => fakes.location.openDirections(home)).called(1);
  });

  testWidgets('no "Navigate" for a job without a map pin', (tester) async {
    when(() => fakes.bookings.watchSupplierJobs(any(), limit: any(named: 'limit')))
        .thenAnswer((_) => Stream.value([booking(status: BookingStatus.accepted)]));
    await pumpScreen(tester, SupplierHome(supplier: supplier(), onRefresh: () {}), fakes, language: 'en');
    await tester.tap(find.text('My jobs'));
    await tester.pumpAndSettle();
    expect(find.text('Navigate in Google Maps'), findsNothing);
  });
}
