import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:latlong2/latlong.dart';
import 'package:mocktail/mocktail.dart';
import 'package:tolely/features/map/data/places_repository.dart';
import 'package:tolely/features/map/presentation/location_picker_screen.dart';

import '../helpers/pump_app.dart';

void main() {
  late Fakes fakes;
  const balkot = Place(label: 'Balkot Chowk', detail: 'Suryabinayak-02 · Bhaktapur', point: LatLng(27.665, 85.3667));
  const balkotBus = Place(label: 'Balkot', detail: 'Bhaktapur', point: LatLng(27.661, 85.3697));

  setUp(() => fakes = Fakes());

  Future<void> open(WidgetTester tester, {String language = 'en'}) =>
      pumpScreen(tester, const LocationPickerScreen(initial: LatLng(27.7, 85.3)), fakes, language: language);

  testWidgets('a place that is said out loud is searched, and the pin moves there', (tester) async {
    when(() => fakes.places.search(any(), language: any(named: 'language')))
        .thenAnswer((_) async => [balkot, balkotBus]);
    await open(tester, language: 'ne');

    await tester.tap(find.byTooltip('ठाउँको नाम बोल्नुहोस्'));
    await tester.pump();
    expect(fakes.speech.listening, isTrue);
    fakes.speech.say('बालकोट चोक');
    await tester.pumpAndSettle();

    verify(() => fakes.places.search('बालकोट चोक', language: 'ne')).called(1);
    expect(find.text('बालकोट चोक'), findsOneWidget); // the words are shown in the box
    expect(find.text('Balkot'), findsOneWidget); // the other match, in case the first is wrong

    await tester.tap(find.byType(FilledButton)); // confirm the location
    await tester.pumpAndSettle();
  });

  testWidgets('typing a place and pressing search works too; the chosen place is returned', (tester) async {
    when(() => fakes.places.search(any(), language: any(named: 'language')))
        .thenAnswer((_) async => [balkot, balkotBus]);
    LatLng? picked;
    await pumpScreen(
      tester,
      Builder(
        builder: (context) => TextButton(
          onPressed: () async => picked = await Navigator.push<LatLng>(
            context,
            MaterialPageRoute(builder: (_) => const LocationPickerScreen(initial: LatLng(27.7, 85.3))),
          ),
          child: const Text('open'),
        ),
      ),
      fakes,
      language: 'en',
    );
    await tester.tap(find.text('open'));
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextField), 'Balkot chowk');
    await tester.testTextInput.receiveAction(TextInputAction.search);
    await tester.pumpAndSettle();
    await tester.tap(find.text('Balkot')); // choose the second match instead
    await tester.pumpAndSettle();
    await tester.tap(find.text('Use this location'));
    await tester.pumpAndSettle();

    expect(picked, balkotBus.point);
  });

  testWidgets('says so when nothing is found', (tester) async {
    when(() => fakes.places.search(any(), language: any(named: 'language'))).thenAnswer((_) async => []);
    await open(tester);
    await tester.enterText(find.byType(TextField), 'zzzz');
    await tester.testTextInput.receiveAction(TextInputAction.search);
    await tester.pumpAndSettle();
    expect(find.textContaining('No place found'), findsOneWidget);
  });

  testWidgets('"mero ghar" / "yahi" goes to the current location instead of searching', (tester) async {
    when(() => fakes.location.currentPosition()).thenAnswer((_) async => const LatLng(27.66, 85.36));
    await open(tester, language: 'ne');
    await tester.tap(find.byTooltip('ठाउँको नाम बोल्नुहोस्'));
    await tester.pump();
    fakes.speech.say('अहिले बसिरहेको घरमा');
    await tester.pumpAndSettle();

    verify(() => fakes.location.currentPosition()).called(1);
    verifyNever(() => fakes.places.search(any(), language: any(named: 'language')));
  });
}
