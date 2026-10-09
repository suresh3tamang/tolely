import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:latlong2/latlong.dart';
import 'package:mocktail/mocktail.dart';
import 'package:tolely/core/utils/schedule.dart';
import 'package:tolely/features/booking/data/booking_repository.dart';
import 'package:tolely/features/booking/presentation/book_screen.dart';
import 'package:tolely/features/customer/presentation/customer_home.dart';
import 'package:tolely/features/voice/domain/voice_draft.dart';

import '../helpers/pump_app.dart';

void main() {
  late Fakes fakes;
  final tomorrow = dayOf(DateTime.now()).add(const Duration(days: 1));

  VoiceDraft draft({String? serviceKey = 'plumber', String reply = 'Plumber, tomorrow 12 PM – 3 PM.'}) => VoiceDraft(
    understood: true,
    reply: reply,
    serviceKey: serviceKey,
    date: tomorrow,
    slot: const TimeSlot(12, 15),
    note: 'kitchen tap leaking',
  );

  setUp(() => fakes = Fakes());

  Future<void> openVoice(WidgetTester tester) async {
    await pumpScreen(tester, const CustomerHome(profile: customerProfile), fakes, language: 'en');
    await tester.tap(find.text('Book by voice'));
    await tester.pumpAndSettle();
  }

  testWidgets('listens as soon as it opens, then opens the booking filled in', (tester) async {
    when(
      () => fakes.voice.understand(
        any(),
        language: any(named: 'language'),
        previous: any(named: 'previous'),
        choice: any(named: 'choice'),
      ),
    ).thenAnswer((_) async => draft());
    await openVoice(tester);
    expect(fakes.speech.listening, isTrue);
    expect(find.text('Listening… speak now'), findsWidgets);

    fakes.speech.say('plumber chaiyo bholi diuso');
    await tester.pumpAndSettle();

    verify(() => fakes.voice.understand('plumber chaiyo bholi diuso', language: 'en')).called(1);
    expect(find.byType(BookScreen), findsOneWidget);
    expect(find.text('Check the details and confirm'), findsOneWidget);
    expect(find.text('Plumber, tomorrow 12 PM – 3 PM.'), findsOneWidget);
    // the day and window are already chosen, so the customer only has to confirm
    expect(tester.widget<ChoiceChip>(find.widgetWithText(ChoiceChip, '12 PM – 3 PM')).selected, isTrue);
    await tester.scrollUntilVisible(
      find.text('kitchen tap leaking'),
      300,
      scrollable: find.descendant(of: find.byType(BookScreen), matching: find.byType(Scrollable)).first,
    );
    expect(find.text('kitchen tap leaking'), findsOneWidget);
  });

  testWidgets('nothing is booked until the customer confirms', (tester) async {
    when(
      () => fakes.voice.understand(
        any(),
        language: any(named: 'language'),
        previous: any(named: 'previous'),
        choice: any(named: 'choice'),
      ),
    ).thenAnswer((_) async => draft());
    when(() => fakes.bookings.create(any())).thenAnswer((_) async {});
    await openVoice(tester);
    fakes.speech.say('plumber chaiyo bholi diuso');
    await tester.pumpAndSettle();
    verifyNever(() => fakes.bookings.create(any()));

    await tester.tap(find.text('Confirm booking · Rs 500'));
    await tester.pumpAndSettle();
    final sent = verify(() => fakes.bookings.create(captureAny())).captured.single as NewBooking;
    expect(sent.serviceKey, 'plumber');
    expect(sent.scheduledFor, tomorrow.add(const Duration(hours: 12)));
    expect(sent.note, 'kitchen tap leaking');
  });

  testWidgets('typing works too, and a question is shown when the service is missing', (tester) async {
    when(
      () => fakes.voice.understand(
        any(),
        language: any(named: 'language'),
        previous: any(named: 'previous'),
        choice: any(named: 'choice'),
      ),
    ).thenAnswer((_) async => draft(serviceKey: null, reply: 'Which service do you need?'));
    await openVoice(tester);
    await tester.enterText(find.byType(TextField), 'kei chaiyo');
    await tester.testTextInput.receiveAction(TextInputAction.send);
    await tester.pumpAndSettle();

    expect(find.text('Which service do you need?'), findsOneWidget);
    expect(find.byType(BookScreen), findsNothing);
  });

  testWidgets('says so when the microphone is not available', (tester) async {
    fakes.speech.available = false;
    await openVoice(tester);
    expect(find.textContaining('Allow the microphone'), findsOneWidget);
  });

  test('a draft from the server', () {
    final d = VoiceDraft.fromJson({
      'understood': true,
      'reply': 'ok',
      'serviceKey': 'tanker',
      'optionId': '8000L',
      'date': '2026-10-10',
      'slot': '18-21',
      'contactPhone': '9811122233',
      'note': '',
    });
    expect(d.date, DateTime(2026, 10, 10));
    expect(d.slot, const TimeSlot(18, 21));
    expect(slotFromId('asap'), TimeSlot.asap);
    expect(slotFromId('07-08'), isNull);
  });

  testWidgets('asks for what is missing, reads the question aloud and listens for the answer', (tester) async {
    final askDay = VoiceDraft(
      understood: true,
      reply: 'Plumber: which day do you need it?',
      serviceKey: 'plumber',
      ask: 'date',
      choices: [
        (
          label: 'Tomorrow',
          value:
              '${tomorrow.year}-${tomorrow.month.toString().padLeft(2, '0')}-${tomorrow.day.toString().padLeft(2, '0')}',
        ),
      ],
    );
    when(() => fakes.voice.understand('plumber chaiyo', language: 'en', previous: null, choice: null))
        .thenAnswer((_) async => askDay);
    when(() => fakes.voice.understand('bholi', language: 'en', previous: askDay, choice: null))
        .thenAnswer((_) async => draft());
    await openVoice(tester);

    fakes.speech.say('plumber chaiyo');
    await tester.pumpAndSettle();
    expect(find.text('Plumber: which day do you need it?'), findsOneWidget);
    expect(find.widgetWithText(ActionChip, 'Tomorrow'), findsOneWidget);
    expect(fakes.speech.spoken, ['Plumber: which day do you need it?']); // read aloud
    expect(fakes.speech.listening, isTrue); // and listening for the answer

    fakes.speech.say('bholi');
    await tester.pumpAndSettle();
    expect(find.byType(BookScreen), findsOneWidget); // remembered "plumber" from the first answer
  });

  testWidgets('a question can be answered by tapping', (tester) async {
    final askDay = VoiceDraft(
      understood: true,
      reply: 'Plumber: which day do you need it?',
      serviceKey: 'plumber',
      ask: 'date',
      choices: const [(label: 'Tomorrow', value: '2026-10-10')],
    );
    when(
      () => fakes.voice.understand(
        any(),
        language: any(named: 'language'),
        previous: any(named: 'previous'),
        choice: any(named: 'choice'),
      ),
    ).thenAnswer((inv) async => inv.namedArguments[#choice] == null ? askDay : draft());
    await openVoice(tester);
    await tester.enterText(find.byType(TextField), 'plumber chaiyo');
    await tester.testTextInput.receiveAction(TextInputAction.send);
    await tester.pumpAndSettle();
    expect(fakes.speech.spoken, isEmpty); // typed, so nothing is read aloud

    await tester.tap(find.widgetWithText(ActionChip, 'Tomorrow'));
    await tester.pumpAndSettle();
    final choice = verify(
      () => fakes.voice.understand(
        any(),
        language: any(named: 'language'),
        previous: askDay,
        choice: captureAny(named: 'choice'),
      ),
    ).captured.single;
    expect(choice, (ask: 'date', value: '2026-10-10'));
    expect(find.byType(BookScreen), findsOneWidget);
  });

  test('a draft goes back to the server without the question', () {
    final d = VoiceDraft.fromJson({
      'understood': true,
      'reply': 'Which day?',
      'serviceKey': 'plumber',
      'slot': 'asap',
      'ask': 'date',
      'choices': [
        {'label': 'Today', 'value': '2026-10-09'},
      ],
    });
    expect(d.isComplete, isFalse);
    expect(d.choices.single.label, 'Today');
    expect(d.toJson(), containsPair('slot', 'asap'));
    expect(d.toJson().containsKey('ask'), isFalse);
  });

  testWidgets('"mero ghar ma" pins the current location on the booking', (tester) async {
    when(
      () => fakes.voice.understand(
        any(),
        language: any(named: 'language'),
        previous: any(named: 'previous'),
        choice: any(named: 'choice'),
      ),
    ).thenAnswer((_) async => draft());
    when(() => fakes.location.currentPosition()).thenAnswer((_) async => const LatLng(27.66, 85.36));
    await openVoice(tester);
    fakes.speech.say('mero ghar ma plumber chaiyo bholi diuso');
    await tester.pumpAndSettle();

    expect(find.byType(BookScreen), findsOneWidget);
    verify(() => fakes.location.currentPosition()).called(1);
  });

  testWidgets('without such words the current location is not asked for', (tester) async {
    when(
      () => fakes.voice.understand(
        any(),
        language: any(named: 'language'),
        previous: any(named: 'previous'),
        choice: any(named: 'choice'),
      ),
    ).thenAnswer((_) async => draft());
    await openVoice(tester);
    fakes.speech.say('plumber chaiyo bholi diuso');
    await tester.pumpAndSettle();
    verifyNever(() => fakes.location.currentPosition());
  });
}
