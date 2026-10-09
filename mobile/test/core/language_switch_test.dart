import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:tolely/app/app.dart';
import 'package:tolely/core/l10n/locale_controller.dart';
import 'package:tolely/core/widgets/language_button.dart';
import 'package:tolely/features/customer/presentation/tip_banner.dart';

/// Regression test for "language change is not working": widgets marked `const`
/// used to keep their old text after a switch because the language was a
/// global value they never listened to.
void main() {
  Future<LocaleController> pumpApp(WidgetTester tester, {String? saved}) async {
    SharedPreferences.setMockInitialValues({'language': ?saved});
    final controller = await LocaleController.load();
    await tester.pumpWidget(
      ChangeNotifierProvider<LocaleController>.value(
        value: controller,
        child: const TolelyApp(
          home: Scaffold(
            // Both are `const` on purpose.
            body: Column(children: [LanguageButton(), TipBanner()]),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    return controller;
  }

  testWidgets('starts in Nepali', (tester) async {
    await pumpApp(tester);
    expect(find.text('मनसुन अघि ट्याङ्की सफा गर्नुहोस्'), findsOneWidget);
    expect(find.text('English'), findsOneWidget); // button offers the other language
  });

  testWidgets('tapping the button switches EVERY widget, including const ones', (tester) async {
    await pumpApp(tester);

    await tester.tap(find.byType(LanguageButton));
    await tester.pumpAndSettle();

    expect(find.text('Clean your tank before monsoon'), findsOneWidget);
    expect(find.text('मनसुन अघि ट्याङ्की सफा गर्नुहोस्'), findsNothing);
    expect(find.text('नेपाली'), findsOneWidget); // button now offers Nepali

    // And back again.
    await tester.tap(find.byType(LanguageButton));
    await tester.pumpAndSettle();
    expect(find.text('मनसुन अघि ट्याङ्की सफा गर्नुहोस्'), findsOneWidget);
  });

  testWidgets('remembers the saved language on the next launch', (tester) async {
    await pumpApp(tester, saved: 'en');
    expect(find.text('Clean your tank before monsoon'), findsOneWidget);
  });
}
