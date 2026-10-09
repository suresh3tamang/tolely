import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:tolely/core/utils/format.dart';
import 'package:tolely/core/utils/geo.dart';

void main() {
  setUpAll(() => initializeDateFormatting('en'));

  test('rupees adds thousands separators', () {
    expect(rupees(0), 'Rs 0');
    expect(rupees(500), 'Rs 500');
    expect(rupees(12000), 'Rs 12,000');
    expect(rupees(1234567), 'Rs 1,234,567');
  });

  test('latLngFromJson accepts valid points only', () {
    final p = latLngFromJson({'lat': 27.7, 'lng': 85.3});
    expect(p?.latitude, 27.7);
    expect(p?.longitude, 85.3);
    expect(latLngFromJson(null), isNull);
    expect(latLngFromJson({'lat': 'x', 'lng': 1}), isNull);
    expect(latLngFromJson({'lat': 1}), isNull);
  });

  test('formats a booked time window', () {
    final start = DateTime(2026, 10, 14, 12);
    expect(formatWindow(start, DateTime(2026, 10, 14, 15)), 'Wed, 14 Oct · 12:00 PM – 3:00 PM');
    expect(formatWindow(start, null), formatDateTime(start));
  });
}
