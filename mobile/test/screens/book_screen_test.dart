import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:tolely/features/booking/data/booking_repository.dart';
import 'package:tolely/features/booking/domain/booking.dart';
import 'package:tolely/features/booking/presentation/book_screen.dart';
import 'package:tolely/features/profile/domain/user_profile.dart';

import '../helpers/pump_app.dart';

/// Tomorrow, 12 PM – 3 PM: always available, whatever time the test runs.
Future<void> pickTime(WidgetTester tester) async {
  await tester.tap(find.text('Tomorrow'));
  await tester.pumpAndSettle();
  await tester.tap(find.text('12 PM – 3 PM'));
  await tester.pumpAndSettle();
}

void main() {
  late Fakes fakes;

  setUp(() => fakes = Fakes());

  testWidgets('shows the options with prices and the total on the button', (tester) async {
    await pumpScreen(
      tester,
      const BookScreen(service: tanker, profile: customerProfile),
      fakes,
      language: 'en',
    );

    expect(find.text('Water Tanker'), findsOneWidget);
    expect(find.text('8,000 Liters'), findsOneWidget);
    expect(find.text('Rs 3,200'), findsOneWidget);
    expect(find.text('Confirm booking · Rs 3,200'), findsOneWidget);

    await tester.tap(find.text('6,000 Liters'));
    await tester.pumpAndSettle();
    expect(find.text('Confirm booking · Rs 2,500'), findsOneWidget);
  });

  testWidgets('starts from the saved address and sends exactly what was chosen', (tester) async {
    when(() => fakes.bookings.create(any())).thenAnswer((_) async {});
    await pumpScreen(
      tester,
      const BookScreen(service: tanker, profile: customerProfile),
      fakes,
      language: 'en',
    );

    expect(find.text('Balkot, Bhaktapur'), findsOneWidget);
    await tester.tap(find.text('6,000 Liters'));
    await tester.pumpAndSettle();
    await pickTime(tester);
    await tester.tap(find.text('Confirm booking · Rs 2,500'));
    await tester.pumpAndSettle();

    final sent = verify(() => fakes.bookings.create(captureAny())).captured.single as NewBooking;
    expect(sent.serviceKey, 'tanker');
    expect(sent.optionId, '6000L');
    expect(sent.address, 'Balkot, Bhaktapur');
    expect(sent.landmark, 'Near the temple');
    expect(sent.paymentMethod, PaymentMethod.cash);
    expect(sent.scheduledFor.hour, 12);
    expect(sent.scheduledEnd.hour, 15);
    expect(sent.contactName, 'Suresh Tamang');
    expect(sent.toJson()['contactPhone'], startsWith('+977'));
    expect(sent.location, isNull);
    expect(sent.toJson().containsKey('price'), isFalse); // the server decides the price
  });

  testWidgets('"Book again" starts with the earlier option selected', (tester) async {
    await pumpScreen(
      tester,
      const BookScreen(service: tanker, profile: customerProfile, optionId: '6000L'),
      fakes,
      language: 'en',
    );
    expect(find.text('Confirm booking · Rs 2,500'), findsOneWidget);
  });

  testWidgets('an empty address is not sent', (tester) async {
    const noAddress = UserProfile(uid: 'u1', role: UserRole.customer, name: 'Suresh', phone: '+9779800000001');
    await pumpScreen(
      tester,
      const BookScreen(service: tanker, profile: noAddress),
      fakes,
      language: 'en',
    );

    await pickTime(tester);
    await tester.tap(find.text('Confirm booking · Rs 3,200'));
    await tester.pumpAndSettle();

    verifyNever(() => fakes.bookings.create(any()));
    expect(find.textContaining('Required'), findsOneWidget);
  });

  testWidgets('a server error is shown and the form stays open', (tester) async {
    when(() => fakes.bookings.create(any())).thenThrow(Exception('boom'));
    await pumpScreen(
      tester,
      const BookScreen(service: tanker, profile: customerProfile),
      fakes,
      language: 'en',
    );

    await pickTime(tester);
    await tester.tap(find.text('Confirm booking · Rs 3,200'));
    await tester.pumpAndSettle();

    expect(find.text('Something went wrong. Please try again.'), findsOneWidget);
    expect(find.byType(BookScreen), findsOneWidget);
  });

  testWidgets('cannot be confirmed until a time is chosen', (tester) async {
    await pumpScreen(tester, const BookScreen(service: tanker, profile: customerProfile), fakes, language: 'en');
    final confirm = find.widgetWithText(FilledButton, 'Confirm booking · Rs 3,200');
    expect(tester.widget<FilledButton>(confirm).onPressed, isNull);
    await pickTime(tester);
    expect(tester.widget<FilledButton>(confirm).onPressed, isNotNull);
  });
}
