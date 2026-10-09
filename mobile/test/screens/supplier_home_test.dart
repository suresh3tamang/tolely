import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
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

    expect(find.textContaining('waiting for verification'), findsWidgets);
    expect(find.text('Online'), findsNothing); // no online switch until verified
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

  testWidgets('going offline tells the server and shows a reminder when refreshed', (tester) async {
    when(() => fakes.suppliers.setOnline(any())).thenAnswer((_) async {});
    var refreshed = 0;
    await pumpScreen(
      tester,
      SupplierHome(supplier: supplier(), onRefresh: () => refreshed++),
      fakes,
      language: 'en',
    );

    await tester.tap(find.byType(Switch));
    await tester.pumpAndSettle();

    verify(() => fakes.suppliers.setOnline(false)).called(1);
    expect(refreshed, 1);
  });

  testWidgets('an offline supplier sees the reminder banner', (tester) async {
    await pumpScreen(
      tester,
      SupplierHome(supplier: supplier(online: false), onRefresh: () {}),
      fakes,
      language: 'en',
    );
    expect(find.textContaining('You are offline'), findsOneWidget);
  });

  testWidgets('the Me tab shows rating, jobs done and earnings', (tester) async {
    when(() => fakes.bookings.watchCompletedJobs(any(), limit: any(named: 'limit')))
        .thenAnswer((_) => Stream.value([booking(status: BookingStatus.completed, price: 3200)]));
    await pumpScreen(
      tester,
      SupplierHome(supplier: supplier(), onRefresh: () {}),
      fakes,
      language: 'en',
    );

    await tester.tap(find.text('Me'));
    await tester.pumpAndSettle();

    expect(find.text('Hari Tamang'), findsWidgets);
    expect(find.text('12'), findsOneWidget); // jobs done
    expect(find.text('4.6 ★'), findsOneWidget); // 23 / 5
    expect(find.text('Verified supplier'), findsOneWidget);
    expect(find.text('Log out'), findsOneWidget);
  });
}
