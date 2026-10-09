import 'package:flutter/material.dart';
import 'package:tolely/core/l10n/l10n.dart';
import 'package:tolely/core/theme/brand.dart';
import 'package:tolely/core/utils/format.dart';
import 'package:tolely/features/booking/domain/booking.dart';

/// Today at a glance, under the online card: jobs today, earned today, rating.
class TodaySummary extends StatelessWidget {
  const TodaySummary({super.key, required this.jobs, required this.rating});

  /// The supplier's own jobs, live.
  final Stream<List<Booking>> jobs;
  final double? rating;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return StreamBuilder<List<Booking>>(
      stream: jobs,
      builder: (context, snapshot) {
        final all = snapshot.data ?? const <Booking>[];
        final now = DateTime.now();
        bool isToday(DateTime? d) => d != null && d.year == now.year && d.month == now.month && d.day == now.day;
        final today = all.where((b) => b.status != BookingStatus.cancelled && isToday(b.scheduledFor)).length;
        final earned = all
            .where((b) => b.status == BookingStatus.completed && isToday(b.completedAt ?? b.scheduledFor))
            .fold(0, (sum, b) => sum + b.supplierEarning);
        return Container(
          margin: const EdgeInsets.only(top: 12),
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: Brand.line)),
          child: IntrinsicHeight(
            child: Row(
              children: [
                _Cell(icon: Icons.today_outlined, value: '$today', label: l10n.todayJobs),
                const VerticalDivider(width: 1, color: Brand.line),
                _Cell(icon: Icons.payments_outlined, value: rupees(earned), label: l10n.todayEarned),
                const VerticalDivider(width: 1, color: Brand.line),
                _Cell(icon: Icons.star_rounded, value: rating == null ? '—' : rating!.toStringAsFixed(1), label: l10n.ratingLabel),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _Cell extends StatelessWidget {
  const _Cell({required this.icon, required this.value, required this.label});

  final IconData icon;
  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    return Expanded(
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 18, color: Brand.blue),
              const SizedBox(width: 4),
              Flexible(
                child: Text(value, style: text.titleMedium?.copyWith(fontWeight: FontWeight.w800), overflow: TextOverflow.ellipsis),
              ),
            ],
          ),
          Text(label, style: text.bodySmall?.copyWith(color: Brand.muted), textAlign: TextAlign.center),
        ],
      ),
    );
  }
}
