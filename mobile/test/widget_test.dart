import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tolely/i18n.dart';
import 'package:tolely/models.dart';
import 'package:tolely/screens/common.dart';

void main() {
  test('rupees formats with thousands separators', () {
    expect(rupees(500), 'Rs 500');
    expect(rupees(12000), 'Rs 12,000');
    expect(rupees(1234567), 'Rs 1,234,567');
  });

  test('tr switches language', () {
    language.value = 'en';
    expect(tr('cash'), 'Cash');
    language.value = 'ne';
    expect(tr('cash'), 'नगद');
    expect(tr('unknown_key'), 'unknown_key');
  });

  test('booking reads status and timestamps', () {
    final accepted = DateTime(2026, 10, 8, 10);
    Booking b(String status) => Booking('id1', {
      'status': status,
      'price': 2500,
      'scheduledFor': Timestamp.fromDate(DateTime(2026, 10, 8, 12)),
      'acceptedAt': Timestamp.fromDate(accepted),
    });

    expect(b('pending').isOpen, isTrue);
    expect(b('on_the_way').isOpen, isTrue);
    expect(b('completed').isOpen, isFalse);
    expect(b('cancelled').isOpen, isFalse);
    expect(b('accepted').acceptedAt, accepted);
    expect(b('accepted').completedAt, isNull);
    expect(b('accepted').price, 2500);
  });

  test('booking reads map pin and live supplier location', () {
    final b = Booking('id2', {
      'status': 'on_the_way',
      'location': {'lat': 27.7, 'lng': 85.33},
      'supplierLocation': {'lat': 27.69, 'lng': 85.34, 'at': null},
    });
    expect(b.location?.latitude, 27.7);
    expect(b.supplierLocation?.longitude, 85.34);
    expect(Booking('id3', {'status': 'pending'}).location, isNull);
  });
}
