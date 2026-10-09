import 'package:flutter/widgets.dart';
import 'package:tolely/core/l10n/localized_text.dart';
import 'package:tolely/l10n/app_localizations.dart';

export 'package:tolely/core/l10n/localized_text.dart';
export 'package:tolely/l10n/app_localizations.dart';

/// Short access to translations from any widget:
///
///   Text(context.l10n.sendCode)       // text written in lib/l10n/*.arb
///   Text(context.text(service.name))  // bilingual text that came from the server
///
/// Both register the widget for rebuilds, so a language change updates every
/// widget, including `const` ones.
extension L10nContext on BuildContext {
  AppLocalizations get l10n => AppLocalizations.of(this);

  String get languageCode => Localizations.localeOf(this).languageCode;

  bool get isNepali => languageCode == 'ne';

  String text(LocalizedText value) => value.resolve(languageCode);
}
