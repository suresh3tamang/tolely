import 'package:flutter_tts/flutter_tts.dart';
import 'package:speech_to_text/speech_to_text.dart';

/// Turns speech into text with the phone's own speech recognition (free, works for Nepali and English).
///
/// Screens use this interface, so tests can replace it with a fake.
abstract class SpeechService {
  /// Starts listening. [onWords] gets the words so far ([isFinal] once the person stops talking),
  /// [onError] a problem (e.g. no permission), [onDone] when listening has ended.
  /// Returns false if speech recognition is not available on this phone.
  Future<bool> start({
    required String localeId,
    required void Function(String words, bool isFinal) onWords,
    required void Function(String error) onError,
    required void Function() onDone,
  });

  Future<void> stop();

  /// Reads [text] aloud with the phone's own voice, if it has one for [language] (`ne-NP`, `en-IN`).
  /// Completes when finished, or at once when no such voice is installed.
  Future<void> speak(String text, {required String language});
}

class DeviceSpeechService implements SpeechService {
  final _speech = SpeechToText();
  bool _ready = false;
  void Function(String error)? _onError;
  void Function()? _onDone;

  @override
  Future<bool> start({
    required String localeId,
    required void Function(String words, bool isFinal) onWords,
    required void Function(String error) onError,
    required void Function() onDone,
  }) async {
    _onError = onError;
    _onDone = onDone;
    // Asks for the microphone permission the first time.
    _ready = _ready ||
        await _speech.initialize(
          onError: (e) => _onError?.call(e.errorMsg),
          onStatus: (status) {
            if (status == SpeechToText.doneStatus || status == SpeechToText.notListeningStatus) _onDone?.call();
          },
        );
    if (!_ready) return false;
    await _speech.listen(
      onResult: (r) => onWords(r.recognizedWords, r.finalResult),
      listenOptions: SpeechListenOptions(
        localeId: localeId,
        partialResults: true,
        listenFor: const Duration(seconds: 20),
        pauseFor: const Duration(seconds: 3),
      ),
    );
    return true;
  }

  @override
  Future<void> stop() async {
    await _speech.stop();
    await _tts.stop();
  }

  final _tts = FlutterTts();

  @override
  Future<void> speak(String text, {required String language}) async {
    try {
      if (await _tts.isLanguageAvailable(language) != true) return;
      await _tts.setLanguage(language);
      await _tts.awaitSpeakCompletion(true);
      await _tts.speak(text);
    } catch (_) {
      // Reading aloud is a bonus: the question is also shown on screen.
    }
  }
}
