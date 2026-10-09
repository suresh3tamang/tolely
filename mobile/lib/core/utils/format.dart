import 'package:intl/intl.dart';

/// `2500` -> `Rs 2,500`. Amounts use Latin digits in every language.
String rupees(int amount) => 'Rs ${NumberFormat.decimalPattern('en').format(amount)}';

// Dates in English or Nepali, with Tolely's own Nepali names (the same as web/src/shared/dates.ts).
// Digits stay 0-9 in both languages, like prices. The language follows the app's language: LocaleController
// sets [dateLanguage], and screens rebuild when it changes.

/// `en` or `ne`. Set by LocaleController; tests can set it directly.
String dateLanguage = 'en';

bool get _ne => dateLanguage == 'ne';

const _weekdaysShort = {
  'en': ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  // Nepali always uses the full name: "शुक्रबार", not "शुक्र".
  'ne': ['सोमबार', 'मंगलबार', 'बुधबार', 'बिहीबार', 'शुक्रबार', 'शनिबार', 'आइतबार'],
};
const _weekdays = {
  'en': ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
  'ne': ['सोमबार', 'मंगलबार', 'बुधबार', 'बिहीबार', 'शुक्रबार', 'शनिबार', 'आइतबार'],
};
const _months = {
  'en': ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  'ne': ['जनवरी', 'फेब्रुअरी', 'मार्च', 'अप्रिल', 'मे', 'जुन', 'जुलाई', 'अगस्ट', 'सेप्टेम्बर', 'अक्टोबर', 'नोभेम्बर', 'डिसेम्बर'],
};

String get _lang => _ne ? 'ne' : 'en';

/// `Fri` / `शुक्रबार`.
String weekdayShort(DateTime d) => _weekdaysShort[_lang]![d.weekday - 1];

/// `Friday` / `शुक्रबार`.
String weekdayName(DateTime d) => _weekdays[_lang]![d.weekday - 1];

/// `Fri, 9 Oct` / `शुक्रबार, 9 अक्टोबर`.
String formatDay(DateTime d) => '${weekdayShort(d)}, ${d.day} ${_months[_lang]![d.month - 1]}';

/// `2:05 PM` / `दिउँसो 2:05` (Nepali says the part of the day instead of AM/PM).
String formatTime(DateTime d) {
  final h12 = d.hour % 12 == 0 ? 12 : d.hour % 12;
  final mm = d.minute.toString().padLeft(2, '0');
  if (!_ne) return '$h12:$mm ${d.hour < 12 ? 'AM' : 'PM'}';
  final part = d.hour < 4
      ? 'राति'
      : d.hour < 12
      ? 'बिहान'
      : d.hour < 16
      ? 'दिउँसो'
      : d.hour < 19
      ? 'बेलुका'
      : 'राति';
  return '$part $h12:$mm';
}

/// `Fri, 9 Oct · 2:05 PM`.
String formatDateTime(DateTime value) => '${formatDay(value)} · ${formatTime(value)}';

/// `Fri, 2:05 PM`.
String formatDayTime(DateTime value) => '${weekdayShort(value)}, ${formatTime(value)}';

/// `9 Oct, 2:05 PM`.
String formatShortDateTime(DateTime value) => '${value.day} ${_months[_lang]![value.month - 1]}, ${formatTime(value)}';

/// `Tue, 14 Oct · 12:00 PM – 3:00 PM` for a booked window, or the single time when there is no end.
String formatWindow(DateTime start, DateTime? end) =>
    end == null ? formatDateTime(start) : '${formatDay(start)} · ${formatTime(start)} – ${formatTime(end)}';
