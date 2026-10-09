import 'package:flutter/material.dart';
import 'package:tolely/core/l10n/l10n.dart';
import 'package:tolely/core/theme/brand.dart';
import 'package:tolely/core/utils/format.dart';
import 'package:tolely/features/booking/domain/booking.dart';

class _Step {
  const _Step(this.label, this.time, {this.isCancel = false});

  final String label;
  final DateTime? time;
  final bool isCancel;
}

/// Vertical timeline: booked → accepted → on the way → arrived → completed (or cancelled).
class BookingTimeline extends StatelessWidget {
  const BookingTimeline(this.booking, {super.key});

  final Booking booking;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final b = booking;
    final steps = [
      _Step(l10n.stepBooked, b.createdAt),
      if (b.status == BookingStatus.cancelled) ...[
        if (b.acceptedAt != null) _Step(l10n.stepAccepted, b.acceptedAt),
        _Step(l10n.stepCancelled, b.cancelledAt, isCancel: true),
      ] else ...[
        _Step(l10n.stepAccepted, b.acceptedAt),
        _Step(l10n.stepOnTheWay, b.departedAt),
        _Step(l10n.stepArrived, b.arrivedAt),
        _Step(l10n.stepCompleted, b.completedAt),
      ],
    ];
    // A released job goes back to pending: only "booked" counts as done then.
    final reached = switch (b.status) {
      BookingStatus.pending => 1,
      BookingStatus.accepted => 2,
      BookingStatus.onTheWay => b.arrivedAt != null ? 4 : 3,
      _ => steps.length,
    };
    final color = Theme.of(context).colorScheme.primary;

    return Column(
      children: [
        for (var i = 0; i < steps.length; i++)
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Column(
                children: [
                  Icon(
                    i < reached ? Icons.check_circle : Icons.radio_button_unchecked,
                    color: steps[i].isCancel ? Brand.muted : (i < reached ? color : Colors.grey.shade400),
                  ),
                  if (i < steps.length - 1)
                    Container(width: 2, height: 28, color: i + 1 < reached ? color : Colors.grey.shade300),
                ],
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.only(top: 2),
                  child: Text.rich(
                    TextSpan(
                      children: [
                        TextSpan(text: steps[i].label),
                        if (i < reached && steps[i].time != null)
                          TextSpan(
                            text: '  ${formatShortDateTime(steps[i].time!)}',
                            style: const TextStyle(color: Colors.grey),
                          ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
      ],
    );
  }
}
