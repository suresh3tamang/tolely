import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:tolely/core/l10n/l10n.dart';
import 'package:tolely/core/l10n/locale_controller.dart';

/// Nepali / English choice for the Profile screens.
class LanguagePicker extends StatelessWidget {
  const LanguagePicker({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final controller = context.watch<LocaleController>();
    return Row(
      children: [
        Text(l10n.languageLabel),
        const SizedBox(width: 16),
        Expanded(
          child: SegmentedButton<String>(
            segments: [
              ButtonSegment(value: 'ne', label: Text(l10n.languageNepali)),
              ButtonSegment(value: 'en', label: Text(l10n.languageEnglish)),
            ],
            selected: {controller.code},
            onSelectionChanged: (selection) => controller.setLanguage(selection.first),
          ),
        ),
      ],
    );
  }
}
