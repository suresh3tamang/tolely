import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:tolely/core/l10n/l10n.dart';
import 'package:tolely/core/utils/format.dart';
import 'package:tolely/core/utils/phone.dart';
import 'package:tolely/core/widgets/feedback.dart';
import 'package:tolely/features/booking/data/booking_repository.dart';
import 'package:tolely/features/booking/domain/booking.dart';
import 'package:tolely/features/booking/presentation/booking_detail_screen.dart';
import 'package:tolely/features/booking/presentation/booking_labels.dart';
import 'package:tolely/features/booking/presentation/booking_money.dart';
import 'package:tolely/features/booking/presentation/status_chip.dart';

/// One job in the supplier's list, with the action that moves it forward.
class JobCard extends StatelessWidget {
  const JobCard(this.job, {super.key});

  final Booking job;

  Future<void> _run(BuildContext context, Future<void> Function() action) async {
    try {
      await action();
    } catch (e) {
      if (context.mounted) showError(context, e);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final text = Theme.of(context).textTheme;
    final b = job;
    final bookings = context.read<BookingRepository>();
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => BookingDetailScreen(bookingId: b.id, asSupplier: true)),
        ),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      '${context.text(b.serviceName)} · ${context.text(b.optionLabel)}',
                      style: text.titleMedium,
                    ),
                  ),
                  StatusChip(b.status),
                ],
              ),
              const SizedBox(height: 6),
              Text(formatWindow(b.scheduledFor, b.scheduledEnd)),
              Text('${b.address}${b.landmark.isEmpty ? '' : ' · ${b.landmark}'}'),
              if (b.note.isNotEmpty) Text('“${b.note}”', style: text.bodySmall),
              Text('${rupees(b.price)} · ${l10n.paymentLabel(b.paymentMethod)}', style: text.titleSmall),
              SupplierEarningLine(b),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  if (b.status == BookingStatus.pending)
                    FilledButton(
                      style: _compact,
                      onPressed: () => _run(context, () => bookings.accept(b.id)),
                      child: Text(l10n.accept),
                    ),
                  if (b.status != BookingStatus.pending) ...[
                    OutlinedButton.icon(
                      onPressed: () => callPhone(b.callPhone),
                      icon: const Icon(Icons.call),
                      label: Text('${l10n.call} ${b.callName ?? ''}'),
                    ),
                    if (b.status == BookingStatus.accepted) ...[
                      FilledButton(
                        style: _compact,
                        onPressed: () => _run(context, () => bookings.setStatus(b.id, BookingStatus.onTheWay)),
                        child: Text(l10n.startTrip),
                      ),
                      TextButton(
                        onPressed: () => _run(context, () => bookings.setStatus(b.id, BookingStatus.pending)),
                        child: Text(l10n.release),
                      ),
                    ],
                    if (b.status == BookingStatus.onTheWay)
                      FilledButton(
                        style: _compact,
                        onPressed: () => _run(context, () => bookings.setStatus(b.id, BookingStatus.completed)),
                        child: Text(l10n.markDone),
                      ),
                  ],
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  // Buttons inside a card are smaller than full-width form buttons.
  static final _compact = FilledButton.styleFrom(minimumSize: const Size(0, 44));
}
