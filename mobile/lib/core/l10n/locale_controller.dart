import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Holds the app language, remembers it between launches, and tells the
/// server about changes (so push notifications arrive in the same language).
///
/// MaterialApp's `locale` follows [locale]; every widget that reads
/// `context.l10n` rebuilds when it changes.
class LocaleController extends ChangeNotifier {
  LocaleController._(this._prefs, this._locale, this.onChanged);

  /// Languages the app is translated into. The first one is the default.
  /// To add one: create lib/l10n/app_<code>.arb and add its code here.
  static const supported = [Locale('ne'), Locale('en')];

  static const _prefsKey = 'language';

  static Future<LocaleController> load({
    SharedPreferences? prefs,
    Future<void> Function(String code)? onChanged,
  }) async {
    final store = prefs ?? await SharedPreferences.getInstance();
    return LocaleController._(store, _fromCode(store.getString(_prefsKey)), onChanged);
  }

  final SharedPreferences _prefs;
  final Future<void> Function(String code)? onChanged;
  Locale _locale;

  Locale get locale => _locale;
  String get code => _locale.languageCode;
  bool get isNepali => code == 'ne';

  /// Switches language. Set [sync] to false when the change came from the
  /// server, so it isn't sent straight back.
  Future<void> setLanguage(String code, {bool sync = true}) async {
    final next = _fromCode(code);
    if (next == _locale) return;
    _locale = next;
    notifyListeners();
    await _prefs.setString(_prefsKey, next.languageCode);
    if (sync) {
      try {
        await onChanged?.call(next.languageCode);
      } catch (_) {
        // Offline or signed out: the local choice still applies.
      }
    }
  }

  Future<void> toggle() => setLanguage(isNepali ? 'en' : 'ne');

  static Locale _fromCode(String? code) =>
      supported.firstWhere((l) => l.languageCode == code, orElse: () => supported.first);
}
