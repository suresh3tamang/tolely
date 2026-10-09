// Choosing "when" when booking: a day and a time window such as 12 PM - 3 PM.
// Mirrors web/src/app/book/schedule.ts so the website and the app offer the same windows.

/// A bookable time window. [from] and [to] are hours of the day; `null` means "as soon as possible".
class TimeSlot {
  const TimeSlot(this.from, this.to);
  final int from;
  final int to;

  static const asap = TimeSlot(-1, -1);
  bool get isAsap => from < 0;

  @override
  bool operator ==(Object other) => other is TimeSlot && other.from == from && other.to == to;

  @override
  int get hashCode => Object.hash(from, to);
}

const slots = [TimeSlot(6, 9), TimeSlot(9, 12), TimeSlot(12, 15), TimeSlot(15, 18), TimeSlot(18, 21)];

/// A window is offered while at least this much of it is still ahead.
const _minLeft = Duration(minutes: 45);
const asapLength = Duration(hours: 3);
const bookAheadDays = 30;

DateTime dayOf(DateTime t) => DateTime(t.year, t.month, t.day);

DateTime _at(DateTime day, int hour) => DateTime(day.year, day.month, day.day, hour);

/// The windows that can still be booked on [day]. "As soon as possible" is only offered today.
List<TimeSlot> availableSlots(DateTime day, DateTime now) {
  final d = dayOf(day);
  final open = [
    for (final s in slots)
      if (_at(d, s.to).difference(_at(d, s.from).isAfter(now) ? _at(d, s.from) : now) >= _minLeft) s,
  ];
  return d == dayOf(now) ? [TimeSlot.asap, ...open] : open;
}

/// Start and end of the chosen window, or null if it cannot be booked.
({DateTime start, DateTime end})? windowFor(DateTime day, TimeSlot slot, DateTime now) {
  final d = dayOf(day);
  if (d.isAfter(dayOf(now).add(const Duration(days: bookAheadDays)))) return null;
  if (!availableSlots(d, now).contains(slot)) return null;
  if (slot.isAsap) return (start: now, end: now.add(asapLength));
  return (start: _at(d, slot.from), end: _at(d, slot.to));
}

String _hour(int h) => '${h % 12 == 0 ? 12 : h % 12} ${h < 12 ? 'AM' : 'PM'}';

/// `12 PM – 3 PM`.
String slotText(TimeSlot s) => '${_hour(s.from)} – ${_hour(s.to)}';

/// `"12-15"` -> the 12 PM – 3 PM window, `"asap"` -> as soon as possible (ids shared with the website).
TimeSlot? slotFromId(String? id) {
  if (id == 'asap') return TimeSlot.asap;
  final parts = id?.split('-');
  if (parts == null || parts.length != 2) return null;
  final slot = TimeSlot(int.tryParse(parts[0]) ?? -9, int.tryParse(parts[1]) ?? -9);
  return slots.contains(slot) ? slot : null;
}
