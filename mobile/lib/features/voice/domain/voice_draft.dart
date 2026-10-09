import 'package:tolely/core/utils/schedule.dart';

/// What the server understood from a spoken request (see web/src/server/voice/voice.service.ts).
/// It is only a draft: the customer checks it on the booking screen and confirms.
class VoiceDraft {
  const VoiceDraft({
    required this.understood,
    required this.reply,
    this.serviceKey,
    this.optionId,
    this.date,
    this.slot,
    this.contactName,
    this.contactPhone,
    this.note = '',
    this.ask,
    this.choices = const [],
    this.atCurrentLocation = false,
  });

  factory VoiceDraft.fromJson(Map<String, dynamic> json) {
    final date = DateTime.tryParse(json['date'] as String? ?? '');
    return VoiceDraft(
      understood: json['understood'] as bool? ?? false,
      reply: json['reply'] as String? ?? '',
      serviceKey: json['serviceKey'] as String?,
      optionId: json['optionId'] as String?,
      date: date == null ? null : DateTime(date.year, date.month, date.day),
      slot: slotFromId(json['slot'] as String?),
      contactName: json['contactName'] as String?,
      contactPhone: json['contactPhone'] as String?,
      note: json['note'] as String? ?? '',
      ask: json['ask'] as String?,
      choices: [
        for (final c in (json['choices'] as List? ?? const []))
          (label: (c as Map)['label'] as String, value: c['value'] as String),
      ],
    );
  }

  /// What the server needs back to continue the conversation (without the question).
  Map<String, dynamic> toJson() {
    String two(int n) => n.toString().padLeft(2, '0');
    return {
      'understood': understood,
      'serviceKey': serviceKey,
      'optionId': optionId,
      'date': date == null ? null : '${date!.year}-${two(date!.month)}-${two(date!.day)}',
      'slot': slot == null ? null : (slot!.isAsap ? 'asap' : '${two(slot!.from)}-${two(slot!.to)}'),
      'contactName': contactName,
      'contactPhone': contactPhone,
      'note': note,
      'reply': reply,
    };
  }

  /// True when nothing is missing: the customer only has to check and confirm.
  bool get isComplete => ask == null && serviceKey != null;

  final bool understood;

  /// One short sentence for the customer: what was understood, or what is missing.
  final String reply;
  final String? serviceKey;
  final String? optionId;
  final DateTime? date;
  final TimeSlot? slot;
  final String? contactName;

  /// Local digits only, e.g. `9811122233`.
  final String? contactPhone;
  final String note;

  /// What to ask next: `service`, `date` or `slot`; null when the booking is complete.
  final String? ask;

  /// Answers to tap instead of speaking, e.g. Today / Tomorrow or the time windows.
  final List<({String label, String value})> choices;

  /// The customer said "mero ghar", "yahi"...: the booking is where they are now (set on the phone).
  final bool atCurrentLocation;

  VoiceDraft withCurrentLocation() => VoiceDraft(
    understood: understood,
    reply: reply,
    serviceKey: serviceKey,
    optionId: optionId,
    date: date,
    slot: slot,
    contactName: contactName,
    contactPhone: contactPhone,
    note: note,
    ask: ask,
    choices: choices,
    atCurrentLocation: true,
  );
}
