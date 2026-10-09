/// A piece of text that exists in several languages, e.g. a service name that
/// the server sends as `nameEn` + `nameNe`.
///
/// App-owned strings (buttons, titles) belong in `lib/l10n/*.arb` instead.
/// Adding a language later: add its code to the map here and in [fromFields].
class LocalizedText {
  const LocalizedText(this._values);

  /// Reads `<base>En` and `<base>Ne` from a JSON map, e.g. base `name` reads
  /// `nameEn` and `nameNe`. Missing values are skipped.
  factory LocalizedText.fromFields(Map<String, dynamic> json, String base) {
    final values = <String, String>{};
    for (final code in const ['en', 'ne']) {
      final value = json['$base${code[0].toUpperCase()}${code.substring(1)}'];
      if (value is String && value.isNotEmpty) values[code] = value;
    }
    return LocalizedText(values);
  }

  final Map<String, String> _values;

  /// The text in [languageCode], falling back to English, then to anything.
  String resolve(String languageCode) =>
      _values[languageCode] ?? _values['en'] ?? (_values.isEmpty ? '' : _values.values.first);

  @override
  String toString() => resolve('en');
}
