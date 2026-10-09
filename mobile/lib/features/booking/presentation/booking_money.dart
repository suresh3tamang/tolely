import 'package:flutter/material.dart';
import 'package:tolely/core/l10n/l10n.dart';
import 'package:tolely/core/theme/brand.dart';
import 'package:tolely/core/utils/format.dart';
import 'package:tolely/features/booking/domain/booking.dart';

/// For suppliers: "You earn Rs 2,944 · after Tolely fee Rs 256".
/// Shows nothing while the platform fee is off.
class SupplierEarningLine extends StatelessWidget {
  const SupplierEarningLine(this.booking, {super.key});

  final Booking booking;

  @override
  Widget build(BuildContext context) {
    if (booking.platformFee <= 0) return const SizedBox.shrink();
    final l10n = context.l10n;
    return Padding(
      padding: const EdgeInsets.only(top: 2),
      child: Text.rich(
        TextSpan(
          children: [
            TextSpan(
              text: l10n.youEarn(rupees(booking.supplierEarning)),
              style: const TextStyle(fontWeight: FontWeight.w700, color: Color(0xFF047857)),
            ),
            TextSpan(
              text: '  ${l10n.feeNote(rupees(booking.platformFee))}',
              style: const TextStyle(color: Brand.muted),
            ),
          ],
        ),
        style: Theme.of(context).textTheme.bodyMedium,
      ),
    );
  }
}

/// For customers: "★ 4.6 (5) · 12 jobs" about the supplier on their booking.
class SupplierTrustLine extends StatelessWidget {
  const SupplierTrustLine(this.booking, {super.key});

  final Booking booking;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final rating = booking.supplierRating;
    final parts = <String>[
      if (rating != null) '${rating.toStringAsFixed(1)} (${booking.supplierRatingCount})' else l10n.supplierNew,
      if (booking.supplierJobs > 0) l10n.jobsCount(booking.supplierJobs),
    ];
    return Row(
      children: [
        if (rating != null) const Icon(Icons.star_rounded, size: 16, color: Colors.amber),
        if (rating != null) const SizedBox(width: 2),
        Flexible(child: Text(parts.join(' · '), overflow: TextOverflow.ellipsis)),
        const SizedBox(width: 6),
        const Icon(Icons.verified, size: 16, color: Colors.green),
      ],
    );
  }
}
