import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:tolely/features/booking/data/booking_repository.dart';
import 'package:tolely/features/booking/domain/booking.dart';
import 'package:tolely/features/booking/presentation/book_screen.dart';
import 'package:tolely/features/profile/domain/user_profile.dart';

import '../helpers/pump_app.dart';

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
    await tester.tap(find.text('Confirm booking · Rs 2,500'));
    await tester.pumpAndSettle();

    final sent = verify(() => fakes.bookings.create(captureAny())).captured.single as NewBooking;
    expect(sent.serviceKey, 'tanker');
    expect(sent.optionId, '6000L');
    expect(sent.address, 'Balkot, Bhaktapur');
    expect(sent.landmark, 'Near the temple');
    expect(sent.paymentMethod, PaymentMethod.cash);
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
    const noAddress = UserProfile(uid: 'u1', role: UserRole.customer, name: 'Suresh');
    await pumpScreen(
      tester,
      const BookScreen(service: tanker, profile: noAddress),
      fakes,
      language: 'en',
    );

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

    await tester.tap(find.text('Confirm booking · Rs 3,200'));
    await tester.pumpAndSettle();

    expect(find.text('Something went wrong. Please try again.'), findsOneWidget);
    expect(find.byType(BookScreen), findsOneWidget);
  });
}
