import 'package:intl/intl.dart';

/// `2500` -> `Rs 2,500`. Amounts use Latin digits in every language.
String rupees(int amount) => 'Rs ${NumberFormat.decimalPattern('en').format(amount)}';

// Dates use English formats in every language for now. When the app should
// show Nepali dates, change them here and every screen follows.
final _dateTime = DateFormat('EEE, d MMM · h:mm a', 'en');
final _dayTime = DateFormat('EEE, h:mm a', 'en');
final _shortDateTime = DateFormat('d MMM, h:mm a', 'en');

String formatDateTime(DateTime value) => _dateTime.format(value);

String formatDayTime(DateTime value) => _dayTime.format(value);

String formatShortDateTime(DateTime value) => _shortDateTime.format(value);

final _timeOnly = DateFormat('h:mm a', 'en');
final _dayOnly = DateFormat('EEE, d MMM', 'en');

/// `Tue, 14 Oct · 12:00 PM – 3:00 PM` for a booked window, or the single time when there is no end.
String formatWindow(DateTime start, DateTime? end) =>
    end == null ? formatDateTime(start) : '${_dayOnly.format(start)} · ${_timeOnly.format(start)} – ${_timeOnly.format(end)}';
