import 'package:flutter_test/flutter_test.dart';
import 'package:tolely/core/l10n/localized_text.dart';

void main() {
  test('reads the En / Ne fields of a JSON map', () {
    final t = LocalizedText.fromFields({'nameEn': 'Plumber', 'nameNe': 'प्लम्बर'}, 'name');
    expect(t.resolve('en'), 'Plumber');
    expect(t.resolve('ne'), 'प्लम्बर');
  });

  test('falls back to English, then to anything', () {
    expect(LocalizedText.fromFields({'nameEn': 'Plumber'}, 'name').resolve('ne'), 'Plumber');
    expect(LocalizedText.fromFields({'nameNe': 'प्लम्बर'}, 'name').resolve('en'), 'प्लम्बर');
    expect(LocalizedText.fromFields({}, 'name').resolve('en'), '');
  });

  test('ignores empty and non-text values', () {
    final t = LocalizedText.fromFields({'nameEn': '', 'nameNe': 5}, 'name');
    expect(t.resolve('en'), '');
  });
}
