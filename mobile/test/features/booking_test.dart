import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tolely/features/booking/data/booking_repository.dart';
import 'package:tolely/features/booking/domain/booking.dart';

void main() {
  group('BookingStatus', () {
    test('wire names match the server', () {
      expect(BookingStatus.onTheWay.wire, 'on_the_way');
      expect(BookingStatus.fromWire('on_the_way'), BookingStatus.onTheWay);
      expect(BookingStatus.fromWire('nonsense'), BookingStatus.pending);
    });

    test('knows which statuses are still open', () {
      expect(BookingStatus.pending.isOpen, isTrue);
      expect(BookingStatus.accepted.isOpen, isTrue);
      expect(BookingStatus.onTheWay.isOpen, isTrue);
      expect(BookingStatus.completed.isOpen, isFalse);
      expect(BookingStatus.cancelled.isOpen, isFalse);
    });
  });

  group('Booking.fromMap', () {
    final scheduled = DateTime(2026, 10, 8, 12);

    Map<String, dynamic> data([Map<String, dynamic> extra = const {}]) => {
      'status': 'accepted',
      'serviceKey': 'tanker',
      'serviceNameEn': 'Water Tanker',
      'serviceNameNe': 'पानी ट्याङ्कर',
      'optionLabelEn': '8,000 Liters',
      'optionLabelNe': '८,००० लिटर',
      'optionId': '8000L',
      'price': 3200,
      'address': 'Balkot',
      'paymentMethod': 'qr',
      'scheduledFor': Timestamp.fromDate(scheduled),
      ...extra,
    };

    test('a supplier calls the booked contact, else the account holder', () {
      final base = {'customerName': 'Sita', 'customerPhone': '+9779800000001'};
      final plain = Booking.fromMap('b1', data(base));
      expect(plain.callName, 'Sita');
      expect(plain.callPhone, '+9779800000001');
      expect(plain.scheduledEnd, isNull);

      final other = Booking.fromMap('b2', data({
        ...base,
        'contactName': 'Hari',
        'contactPhone': '+9779811122233',
        'scheduledEnd': Timestamp.fromDate(scheduled.add(const Duration(hours: 3))),
      }));
      expect(other.callName, 'Hari');
      expect(other.callPhone, '+9779811122233');
      expect(other.scheduledEnd, scheduled.add(const Duration(hours: 3)));
    });

    test('reads text, price, status and times', () {
      final b = Booking.fromMap('b1', data({'acceptedAt': Timestamp.fromDate(scheduled)}));
      expect(b.id, 'b1');
      expect(b.status, BookingStatus.accepted);
      expect(b.serviceName.resolve('ne'), 'पानी ट्याङ्कर');
      expect(b.optionLabel.resolve('en'), '8,000 Liters');
      expect(b.price, 3200);
      expect(b.paymentMethod, PaymentMethod.qr);
      expect(b.scheduledFor, scheduled);
      expect(b.acceptedAt, scheduled);
      expect(b.completedAt, isNull);
      expect(b.isOpen, isTrue);
    });

    test('reads the map pin and the live supplier position', () {
      final b = Booking.fromMap(
        'b2',
        data({
          'status': 'on_the_way',
          'location': {'lat': 27.7, 'lng': 85.33},
          'supplierLocation': {'lat': 27.69, 'lng': 85.34, 'at': null},
        }),
      );
      expect(b.location?.latitude, 27.7);
      expect(b.supplierLocation?.longitude, 85.34);
      expect(Booking.fromMap('b3', data()).location, isNull);
    });

    test('survives missing optional fields', () {
      final b = Booking.fromMap('b4', {'status': 'pending'});
      expect(b.price, 0);
      expect(b.landmark, '');
      expect(b.supplierName, isNull);
    });
  });

  test('NewBooking sends what the server expects (and no price)', () {
    final json = NewBooking(
      serviceKey: 'tanker',
      optionId: '8000L',
      address: 'Balkot',
      scheduledFor: DateTime.utc(2026, 10, 8, 6),
      scheduledEnd: DateTime.utc(2026, 10, 8, 9),
      contactName: 'Hari',
      contactPhone: '9811122233',
      paymentMethod: PaymentMethod.cash,
    ).toJson();

    expect(json['serviceKey'], 'tanker');
    expect(json['paymentMethod'], 'cash');
    expect(json['scheduledFor'], '2026-10-08T06:00:00.000Z');
    expect(json['scheduledEnd'], '2026-10-08T09:00:00.000Z');
    expect(json['contactName'], 'Hari');
    expect(json['contactPhone'], '+9779811122233');
    expect(json['location'], isNull);
    expect(json.containsKey('price'), isFalse);
  });
}
