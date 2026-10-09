import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:provider/provider.dart';
import 'package:tolely/core/l10n/l10n.dart';
import 'package:tolely/core/l10n/locale_controller.dart';
import 'package:tolely/core/navigation/root_keys.dart';
import 'package:tolely/core/theme/app_theme.dart';
import 'package:tolely/features/auth/presentation/auth_gate.dart';

/// The root widget: theme, language and the first screen.
class TolelyApp extends StatelessWidget {
  /// [home] is the first screen; tests pass a simple screen instead of the
  /// login flow (which needs Firebase).
  const TolelyApp({super.key, this.home = const AuthGate()});

  final Widget home;

  @override
  Widget build(BuildContext context) {
    // Rebuilds when the language changes; `locale` makes Flutter reload the
    // translations and rebuild every widget that reads them.
    final locale = context.select<LocaleController, Locale>((c) => c.locale);
    return MaterialApp(
      onGenerateTitle: (context) => context.l10n.appName,
      debugShowCheckedModeBanner: false,
      navigatorKey: rootNavigatorKey,
      scaffoldMessengerKey: rootMessengerKey,
      theme: buildTheme(),
      locale: locale,
      supportedLocales: AppLocalizations.supportedLocales,
      localizationsDelegates: const [
        AppLocalizations.delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      home: home,
    );
  }
}
