import 'package:flutter_test/flutter_test.dart';
import 'package:tolely/core/utils/schedule.dart';

void main() {
  final morning = DateTime(2026, 10, 9, 7);
  final tomorrow = DateTime(2026, 10, 10);

  test('tomorrow offers every window but not "as soon as possible"', () {
    expect(availableSlots(tomorrow, morning), slots);
  });

  test('today offers windows with time left, plus "as soon as possible"', () {
    expect(availableSlots(DateTime(2026, 10, 9), DateTime(2026, 10, 9, 13)), [TimeSlot.asap, slots[2], slots[3], slots[4]]);
    // 2:30 pm: only 30 minutes of the 12-3 window remain
    expect(availableSlots(DateTime(2026, 10, 9), DateTime(2026, 10, 9, 14, 30)), [TimeSlot.asap, slots[3], slots[4]]);
    expect(availableSlots(DateTime(2026, 10, 9), DateTime(2026, 10, 9, 21, 30)), [TimeSlot.asap]);
  });

  test('gives the exact start and end of a window', () {
    final w = windowFor(tomorrow, slots[2], morning)!;
    expect(w.start, DateTime(2026, 10, 10, 12));
    expect(w.end, DateTime(2026, 10, 10, 15));
  });

  test('"as soon as possible" starts now and lasts three hours', () {
    final w = windowFor(DateTime(2026, 10, 9), TimeSlot.asap, morning)!;
    expect(w.start, morning);
    expect(w.end.difference(w.start), const Duration(hours: 3));
  });

  test('refuses windows that are over or too far ahead', () {
    expect(windowFor(DateTime(2026, 10, 9), slots[0], DateTime(2026, 10, 9, 10)), isNull);
    expect(windowFor(DateTime(2026, 12, 25), slots[2], morning), isNull);
  });

  test('labels windows like people say them', () {
    expect(slotText(slots[2]), '12 PM – 3 PM');
    expect(slotText(slots[0]), '6 AM – 9 AM');
  });
}
