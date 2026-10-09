import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:tolely/core/l10n/l10n.dart';
import 'package:tolely/core/l10n/locale_controller.dart';
import 'package:tolely/core/services/speech_service.dart';
import 'package:tolely/core/theme/brand.dart';
import 'package:tolely/core/utils/here_words.dart';
import 'package:tolely/core/widgets/feedback.dart';
import 'package:tolely/features/voice/data/voice_repository.dart';
import 'package:tolely/features/voice/domain/voice_draft.dart';

/// Opens the "book by voice" sheet. Returns a draft when the customer's request was understood.
Future<VoiceDraft?> showVoiceSheet(BuildContext context) => showModalBottomSheet<VoiceDraft>(
  context: context,
  isScrollControlled: true,
  showDragHandle: true,
  builder: (_) => const VoiceSheet(),
);

enum _Stage { idle, listening, thinking }

/// A short conversation: listens as soon as it opens ("plumber chaiyo"), then asks what is missing
/// ("which day?", "what time?"), reading each question aloud and listening for the answer. Answers can also
/// be tapped or typed. Closes with the finished draft for the customer to confirm.
class VoiceSheet extends StatefulWidget {
  const VoiceSheet({super.key});

  @override
  State<VoiceSheet> createState() => _VoiceSheetState();
}

class _VoiceSheetState extends State<VoiceSheet> {
  final _text = TextEditingController();
  _Stage _stage = _Stage.idle;
  String _message = '';
  bool _isError = false;

  /// What was understood so far in this conversation.
  VoiceDraft? _draft;

  /// After a spoken answer, the next question is read aloud and the mic opens again by itself.
  bool _handsFree = false;

  /// Set once the customer has said "mero ghar", "yahi"... in this conversation.
  bool _here = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _listen());
  }

  @override
  void dispose() {
    if (_stage == _Stage.listening) context.read<SpeechService>().stop();
    _text.dispose();
    super.dispose();
  }

  Future<void> _listen() async {
    final speech = context.read<SpeechService>();
    if (_stage == _Stage.listening) return speech.stop();
    final nepali = context.read<LocaleController>().isNepali;
    final l10n = context.l10n;
    var finalWords = '';
    _handsFree = true;
    setState(() {
      _stage = _Stage.listening;
      _text.clear();
    });
    final ok = await speech.start(
      localeId: nepali ? 'ne_NP' : 'en_IN',
      onWords: (words, isFinal) {
        if (!mounted) return;
        if (isFinal) finalWords = words;
        _text.text = words;
      },
      onError: (_) {
        if (mounted) setState(() => _say(l10n.voiceNotHeard, error: true));
      },
      onDone: () {
        if (!mounted || _stage != _Stage.listening) return;
        final words = finalWords.isNotEmpty ? finalWords : _text.text;
        if (words.trim().length >= 2) {
          _understand(words);
        } else {
          setState(() => _stage = _Stage.idle);
        }
      },
    );
    if (!ok && mounted) setState(() => _say(l10n.micBlocked, error: true));
  }

  void _say(String message, {bool error = false}) {
    _stage = _Stage.idle;
    _message = message;
    _isError = error;
  }

  /// One turn: what was said (or the tapped [choice]) goes to the server with what was understood before.
  Future<void> _understand(String words, {({String ask, String value})? choice}) async {
    final text = words.trim();
    if ((choice == null && text.length < 2) || _stage == _Stage.thinking) return;
    final language = context.read<LocaleController>().code;
    final speech = context.read<SpeechService>();
    _here = _here || meansCurrentLocation(text);
    setState(() {
      _stage = _Stage.thinking;
      _message = '';
    });
    try {
      final draft = await context.read<VoiceRepository>().understand(
        text,
        language: language,
        previous: _draft,
        choice: choice,
      );
      if (!mounted) return;
      if (draft.isComplete) return Navigator.pop(context, _here ? draft.withCurrentLocation() : draft);
      _text.clear();
      setState(() {
        _draft = draft;
        _say(draft.reply); // e.g. "Which day do you need it?"
      });
      if (_handsFree) {
        await speech.speak(draft.reply, language: language == 'ne' ? 'ne-NP' : 'en-IN');
        if (mounted && _stage == _Stage.idle) await _listen();
      }
    } catch (e) {
      if (mounted) setState(() => _say(errorMessage(context, e), error: true));
    }
  }

  void _choose(({String label, String value}) c) {
    _handsFree = false;
    context.read<SpeechService>().stop();
    _understand('', choice: (ask: _draft!.ask!, value: c.value));
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final text = Theme.of(context).textTheme;
    final listening = _stage == _Stage.listening;

    return Padding(
      padding: EdgeInsets.fromLTRB(24, 0, 24, 24 + MediaQuery.viewInsetsOf(context).bottom),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(l10n.voiceTitle, style: text.titleLarge),
          const SizedBox(height: 4),
          Text(l10n.voiceHint, style: text.bodyMedium?.copyWith(color: Brand.muted), textAlign: TextAlign.center),
          const SizedBox(height: 24),
          Semantics(
            button: true,
            label: l10n.voiceTapToSpeak,
            child: GestureDetector(
              onTap: _stage == _Stage.thinking ? null : _listen,
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 300),
                width: listening ? 96 : 84,
                height: listening ? 96 : 84,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: listening ? Colors.red : Brand.blue,
                  boxShadow: [
                    if (listening) BoxShadow(color: Colors.red.withValues(alpha: 0.35), blurRadius: 24, spreadRadius: 8),
                  ],
                ),
                child: Icon(listening ? Icons.stop_rounded : Icons.mic_rounded, color: Colors.white, size: 40),
              ),
            ),
          ),
          const SizedBox(height: 12),
          Text(
            switch (_stage) {
              _Stage.listening => l10n.voiceListening,
              _Stage.thinking => l10n.voiceThinking,
              _Stage.idle => l10n.voiceTapToSpeak,
            },
            style: text.bodyMedium?.copyWith(color: Brand.muted),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _text,
            minLines: 1,
            maxLines: 3,
            maxLength: 300,
            textInputAction: TextInputAction.send,
            onSubmitted: (value) {
              _handsFree = false;
              _understand(value);
            },
            decoration: InputDecoration(
              hintText: l10n.voicePlaceholder,
              counterText: '',
              suffixIcon: _stage == _Stage.thinking
                  ? const Padding(padding: EdgeInsets.all(12), child: SizedBox.square(dimension: 20, child: CircularProgressIndicator(strokeWidth: 2)))
                  : IconButton(
                      tooltip: l10n.voiceSend,
                      icon: const Icon(Icons.send_rounded),
                      onPressed: () {
                        _handsFree = false;
                        _understand(_text.text);
                      },
                    ),
            ),
          ),
          if (_message.isNotEmpty) ...[
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: _isError ? Colors.red.shade50 : Colors.blue.shade50,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _message,
                    style: (_isError ? text.bodyMedium : text.titleMedium)?.copyWith(
                      color: _isError ? Colors.red.shade800 : Brand.deepBlue,
                    ),
                  ),
                  if (!_isError && (_draft?.choices.isNotEmpty ?? false)) ...[
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        for (final c in _draft!.choices)
                          ActionChip(label: Text(c.label), onPressed: _stage == _Stage.thinking ? null : () => _choose(c)),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}
