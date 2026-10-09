import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:tolely/features/booking/domain/booking.dart';
import 'package:tolely/features/customer/presentation/customer_home.dart';

import '../helpers/pump_app.dart';

void main() {
  late Fakes fakes;

  setUp(() => fakes = Fakes());

  testWidgets('home greets the customer and shows a tile per service, in Nepali', (tester) async {
    await pumpScreen(tester, const CustomerHome(profile: customerProfile), fakes);

    expect(find.text('नमस्ते, Suresh 👋'), findsOneWidget);
    expect(find.text('Balkot, Bhaktapur'), findsOneWidget);
    expect(find.text('पानी ट्याङ्कर'), findsOneWidget);
    expect(find.text('प्लम्बर'), findsOneWidget);
    // "From" shows the CHEAPEST option (6,000 L at Rs 2,500), not the first one.
    expect(find.text('Rs 2,500 देखि'), findsOneWidget);
    expect(find.text('Rs 500 देखि'), findsOneWidget);
  });

  testWidgets('switching language changes the whole home screen', (tester) async {
    await pumpScreen(tester, const CustomerHome(profile: customerProfile), fakes);

    await tester.tap(find.text('English')); // the language button offers the other language
    await tester.pumpAndSettle();

    expect(find.text('Namaste, Suresh 👋'), findsOneWidget);
    expect(find.text('Water Tanker'), findsOneWidget);
    expect(find.text('From Rs 2,500'), findsOneWidget);
    expect(find.text('Clean your tank before monsoon'), findsOneWidget);
    expect(find.text('नमस्ते, Suresh 👋'), findsNothing);
    expect(find.text('Home'), findsOneWidget); // bottom bar too
  });

  testWidgets('shows the open booking on top of Home', (tester) async {
    when(() => fakes.bookings.watchCustomerBookings(any(), limit: any(named: 'limit')))
        .thenAnswer((_) => Stream.value([booking(status: BookingStatus.onTheWay, supplierName: 'Hari')]));
    await pumpScreen(tester, const CustomerHome(profile: customerProfile), fakes, language: 'en');

    expect(find.text('On the way'), findsOneWidget);
  });

  testWidgets('My bookings lists bookings, with the supplier and a cancel button', (tester) async {
    when(() => fakes.bookings.watchCustomerBookings(any(), limit: any(named: 'limit')))
        .thenAnswer((_) => Stream.value([booking(status: BookingStatus.accepted, supplierName: 'Hari')]));
    when(() => fakes.bookings.cancel('b1')).thenAnswer((_) async {});
    await pumpScreen(tester, const CustomerHome(profile: customerProfile), fakes, language: 'en');

    await tester.tap(find.text('My bookings'));
    await tester.pumpAndSettle();

    expect(find.text('Water Tanker · 8,000 Liters'), findsOneWidget);
    expect(find.text('Accepted'), findsWidgets);
    expect(find.text('Hari'), findsOneWidget);

    await tester.tap(find.text('Cancel'));
    await tester.pumpAndSettle();
    verify(() => fakes.bookings.cancel('b1')).called(1);
  });

  testWidgets('a finished booking can be rated once', (tester) async {
    when(() => fakes.bookings.watchCustomerBookings(any(), limit: any(named: 'limit')))
        .thenAnswer((_) => Stream.value([booking(status: BookingStatus.completed, supplierName: 'Hari')]));
    when(() => fakes.bookings.rate('b1', 4)).thenAnswer((_) async {});
    await pumpScreen(tester, const CustomerHome(profile: customerProfile), fakes, language: 'en');

    await tester.tap(find.text('My bookings'));
    await tester.pumpAndSettle();
    await tester.tap(find.byIcon(Icons.star_border).at(3)); // 4th star
    await tester.pumpAndSettle();

    verify(() => fakes.bookings.rate('b1', 4)).called(1);
    expect(find.text('Book again'), findsOneWidget);
  });

  testWidgets('an empty list says so', (tester) async {
    await pumpScreen(tester, const CustomerHome(profile: customerProfile), fakes, language: 'en');
    await tester.tap(find.text('My bookings'));
    await tester.pumpAndSettle();
    expect(find.text('No bookings yet'), findsOneWidget);
  });

  testWidgets('Profile has the language choice, log out and delete account', (tester) async {
    await pumpScreen(tester, const CustomerHome(profile: customerProfile), fakes, language: 'en');
    await tester.tap(find.text('Profile'));
    await tester.pumpAndSettle();

    expect(find.text('Suresh Tamang'), findsOneWidget); // in the name field
    expect(find.text('+9779800000001'), findsOneWidget);
    expect(find.text('Log out'), findsOneWidget);
    expect(find.text('Delete account'), findsOneWidget);
    expect(find.text('नेपाली'), findsWidgets);
  });
}
