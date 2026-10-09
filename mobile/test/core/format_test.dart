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

  test('dates in Nepali use Nepali weekday and month names', () {
    dateLanguage = 'ne';
    addTearDown(() => dateLanguage = 'en');
    final friday = DateTime(2026, 10, 9, 14, 5);
    expect(weekdayName(friday), 'शुक्रबार');
    expect(weekdayName(DateTime(2026, 10, 11)), 'आइतबार');
    expect(formatDay(friday), 'शुक्रबार, 9 अक्टोबर');
    expect(formatTime(friday), 'दिउँसो 2:05');
    expect(formatTime(DateTime(2026, 10, 9, 7, 30)), 'बिहान 7:30');
    expect(formatTime(DateTime(2026, 10, 9, 20)), 'राति 8:00');
    expect(formatWindow(DateTime(2026, 10, 14, 12), DateTime(2026, 10, 14, 15)), 'बुधबार, 14 अक्टोबर · दिउँसो 12:00 – दिउँसो 3:00');
  });

  test('dates in English', () {
    dateLanguage = 'en';
    expect(formatDateTime(DateTime(2026, 10, 9, 14, 5)), 'Fri, 9 Oct · 2:05 PM');
    expect(formatShortDateTime(DateTime(2026, 10, 9, 9)), '9 Oct, 9:00 AM');
  });
}
