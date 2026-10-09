import 'package:flutter/material.dart';
import 'package:tolely/core/l10n/l10n.dart';
import 'package:tolely/core/theme/brand.dart';
import 'package:tolely/core/utils/format.dart';
import 'package:tolely/core/widgets/pressable.dart';
import 'package:tolely/features/catalog/domain/service.dart';
import 'package:tolely/features/catalog/presentation/service_style.dart';

/// A coloured tile on the Home screen for one bookable service.
class ServiceTile extends StatelessWidget {
  const ServiceTile({super.key, required this.service, required this.onTap});

  final Service service;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final color = serviceColor(service.icon);
    return Pressable(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(22),
          border: Border.all(color: Brand.line),
          boxShadow: [BoxShadow(color: color.withValues(alpha: 0.08), blurRadius: 18, offset: const Offset(0, 8))],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ServiceAvatar(service.icon, size: 52),
            const Spacer(),
            Text(context.text(service.name), style: text.titleMedium, maxLines: 2, overflow: TextOverflow.ellipsis),
            const SizedBox(height: 2),
            Row(
              children: [
                Flexible(
                  child: Text(
                    context.l10n.fromPrice(rupees(service.cheapest.price)),
                    overflow: TextOverflow.ellipsis,
                    style: text.bodySmall?.copyWith(color: Brand.muted),
                  ),
                ),
                const Spacer(),
                Icon(Icons.arrow_forward_rounded, size: 18, color: color),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
