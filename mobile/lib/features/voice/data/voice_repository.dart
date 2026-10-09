import 'package:tolely/core/network/api_client.dart';
import 'package:tolely/features/voice/domain/voice_draft.dart';

const _weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/// Sends what the customer said to the server, which turns it into a booking draft. Books nothing.
class VoiceRepository {
  const VoiceRepository(this._api);

  final ApiClient _api;

  /// One turn of the conversation: what was said (or the tapped [choice]) plus what was understood before.
  Future<VoiceDraft> understand(
    String text, {
    required String language,
    VoiceDraft? previous,
    ({String ask, String value})? choice,
    DateTime? now,
  }) async {
    final t = now ?? DateTime.now();
    String two(int n) => n.toString().padLeft(2, '0');
    final data = await _api.post('/api/voice/parse', {
      'text': text,
      'lang': language,
      'previous': previous?.toJson(),
      'choice': choice == null ? null : {'ask': choice.ask, 'value': choice.value},
      // The phone's own date and time, so "today" means the customer's day.
      'today': '${t.year}-${two(t.month)}-${two(t.day)}',
      'time': '${two(t.hour)}:${two(t.minute)}',
      'weekday': _weekdays[t.weekday - 1],
    }) as Map<String, dynamic>;
    return VoiceDraft.fromJson(data['draft'] as Map<String, dynamic>);
  }
}
