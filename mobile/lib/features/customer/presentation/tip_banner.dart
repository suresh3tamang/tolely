import 'package:flutter/material.dart';
import 'package:tolely/core/l10n/l10n.dart';
import 'package:tolely/core/theme/brand.dart';

/// A helpful reminder at the bottom of Home. Reads the language through
/// `context.l10n`, so it updates even though it is `const`.
class TipBanner extends StatelessWidget {
  const TipBanner({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final text = Theme.of(context).textTheme;
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: const Color(0xFFFFF7E6),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: const Color(0xFFFDE7B0)),
      ),
      child: Row(
        children: [
          const Text('💧', style: TextStyle(fontSize: 32)),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(l10n.tipTitle, style: text.titleMedium),
                Text(l10n.tipBody, style: text.bodyMedium?.copyWith(color: Brand.muted)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
