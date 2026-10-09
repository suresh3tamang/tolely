import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:tolely/core/l10n/locale_controller.dart';

void main() {
  setUp(() => SharedPreferences.setMockInitialValues({}));

  test('defaults to Nepali', () async {
    final c = await LocaleController.load();
    expect(c.locale, const Locale('ne'));
    expect(c.isNepali, isTrue);
  });

  test('setLanguage notifies listeners, saves, and reports the change', () async {
    final changes = <String>[];
    final c = await LocaleController.load(onChanged: (code) async => changes.add(code));
    var notified = 0;
    c.addListener(() => notified++);

    await c.setLanguage('en');

    expect(c.code, 'en');
    expect(notified, 1);
    expect(changes, ['en']);
    expect((await SharedPreferences.getInstance()).getString('language'), 'en');
  });

  test('setting the same language again does nothing', () async {
    final changes = <String>[];
    final c = await LocaleController.load(onChanged: (code) async => changes.add(code));
    await c.setLanguage('ne');
    expect(changes, isEmpty);
  });

  test('a change that came from the server is not sent back', () async {
    final changes = <String>[];
    final c = await LocaleController.load(onChanged: (code) async => changes.add(code));
    await c.setLanguage('en', sync: false);
    expect(c.code, 'en');
    expect(changes, isEmpty);
  });

  test('a failing server sync does not undo the local choice', () async {
    final c = await LocaleController.load(onChanged: (_) async => throw Exception('offline'));
    await c.setLanguage('en');
    expect(c.code, 'en');
  });

  test('unknown codes fall back to the default', () async {
    SharedPreferences.setMockInitialValues({'language': 'fr'});
    final c = await LocaleController.load();
    expect(c.code, 'ne');
  });

  test('toggle flips between the two languages', () async {
    final c = await LocaleController.load();
    await c.toggle();
    expect(c.code, 'en');
    await c.toggle();
    expect(c.code, 'ne');
  });
}
