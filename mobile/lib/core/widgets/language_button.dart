import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:tolely/core/l10n/l10n.dart';
import 'package:tolely/core/l10n/locale_controller.dart';
import 'package:tolely/core/theme/brand.dart';

/// Pill button that switches between Nepali and English.
class LanguageButton extends StatelessWidget {
  const LanguageButton({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: Material(
        color: Colors.white,
        shape: const StadiumBorder(side: BorderSide(color: Brand.line)),
        child: InkWell(
          customBorder: const StadiumBorder(),
          onTap: () {
            HapticFeedback.selectionClick();
            context.read<LocaleController>().toggle();
          },
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.translate, size: 16, color: Brand.muted),
                const SizedBox(width: 4),
                // Shows the language you will switch TO.
                Text(
                  l10n.switchLanguageLabel,
                  style: const TextStyle(fontWeight: FontWeight.w700, color: Brand.ink),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// App bar actions shared by the main screens. Log out lives in Profile.
List<Widget> appBarActions() => const [LanguageButton()];
