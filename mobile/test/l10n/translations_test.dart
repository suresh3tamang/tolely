import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

/// Keeps the translation files in step as features are added.
void main() {
  Map<String, dynamic> load(String lang) =>
      jsonDecode(File('lib/l10n/app_$lang.arb').readAsStringSync()) as Map<String, dynamic>;

  Iterable<String> keys(Map<String, dynamic> arb) => arb.keys.where((k) => !k.startsWith('@'));

  final en = load('en'), ne = load('ne');

  test('every English text has a Nepali translation, and vice versa', () {
    expect(keys(ne).toSet(), keys(en).toSet());
  });

  test('no translation is empty', () {
    for (final arb in [en, ne]) {
      for (final key in keys(arb)) {
        expect((arb[key] as String).trim(), isNotEmpty, reason: '$key is empty');
      }
    }
  });

  test('keys are camelCase identifiers', () {
    for (final key in keys(en)) {
      expect(RegExp(r'^[a-z][A-Za-z0-9]*$').hasMatch(key), isTrue, reason: '"$key" is not camelCase');
    }
  });

  test('placeholders like {amount} appear in both languages', () {
    final placeholder = RegExp(r'\{(\w+)\}');
    for (final key in keys(en)) {
      final inEn = placeholder.allMatches(en[key] as String).map((m) => m[1]).toSet();
      final inNe = placeholder.allMatches(ne[key] as String).map((m) => m[1]).toSet();
      expect(inNe, inEn, reason: 'placeholders of "$key" differ between languages');
    }
  });
}
