import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:tolely/core/l10n/l10n.dart';
import 'package:tolely/core/services/location_service.dart';
import 'package:tolely/core/theme/brand.dart';
import 'package:tolely/core/utils/format.dart';
import 'package:tolely/core/utils/phone.dart';
import 'package:tolely/core/widgets/feedback.dart';
import 'package:tolely/features/booking/data/booking_repository.dart';
import 'package:tolely/features/booking/domain/booking.dart';
import 'package:tolely/features/booking/presentation/booking_detail_screen.dart';
import 'package:tolely/features/booking/presentation/booking_labels.dart';
import 'package:tolely/features/booking/presentation/booking_money.dart';
import 'package:tolely/features/booking/presentation/status_chip.dart';
import 'package:tolely/features/catalog/presentation/service_style.dart';

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
    final arrived = b.arrivedAt != null;
    final location = context.read<LocationService>();

    // The one main thing to do next, as a big button.
    final (String? mainLabel, IconData? mainIcon, Future<void> Function()? mainAction) = switch (b.status) {
      BookingStatus.pending => (l10n.accept, Icons.check_circle_outline, () => bookings.accept(b.id)),
      BookingStatus.accepted => (
        l10n.startTrip,
        Icons.navigation_outlined,
        () async {
          await bookings.setStatus(b.id, BookingStatus.onTheWay);
          // Leaving now: open navigation to the customer straight away.
          if (b.location != null) await location.openDirections(b.location!);
        },
      ),
      BookingStatus.onTheWay when !arrived => (
        l10n.iHaveArrived,
        Icons.place_outlined,
        () => bookings.markArrived(b.id),
      ),
      BookingStatus.onTheWay => (
        l10n.markDone,
        Icons.task_alt,
        () => bookings.setStatus(b.id, BookingStatus.completed),
      ),
      _ => (null, null, null),
    };

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Material(
        color: Colors.white,
        elevation: 1.5,
        shadowColor: const Color(0x330F172A),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(18),
          side: const BorderSide(color: Brand.line),
        ),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: () => Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => BookingDetailScreen(bookingId: b.id, asSupplier: true)),
          ),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    ServiceAvatar(iconForServiceKey(b.serviceKey), size: 46),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            context.text(b.serviceName),
                            style: text.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                          ),
                          Text(context.text(b.optionLabel), style: text.bodyMedium?.copyWith(color: Brand.muted)),
                        ],
                      ),
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(rupees(b.price), style: text.titleMedium?.copyWith(fontWeight: FontWeight.w800)),
                        Text(l10n.paymentLabel(b.paymentMethod), style: text.bodySmall?.copyWith(color: Brand.muted)),
                      ],
                    ),
                  ],
                ),
                if (b.status != BookingStatus.pending) ...[
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      StatusChip(b.status),
                      if (arrived && b.status == BookingStatus.onTheWay) ...[
                        const SizedBox(width: 8),
                        _Tag(icon: Icons.check, label: l10n.arrivedChip, color: Colors.green.shade700),
                      ],
                      if (b.lateByMinutes != null && !arrived && b.isOpen) ...[
                        const SizedBox(width: 8),
                        _Tag(
                          icon: Icons.schedule,
                          label: l10n.lateNote(b.lateByMinutes!),
                          color: Colors.orange.shade800,
                        ),
                      ],
                    ],
                  ),
                ],
                const SizedBox(height: 12),
                _Info(icon: Icons.schedule, text: formatWindow(b.scheduledFor, b.scheduledEnd)),
                _Info(icon: Icons.place_outlined, text: [b.address, b.landmark].where((s) => s.isNotEmpty).join(' · ')),
                if (b.note.isNotEmpty) _Info(icon: Icons.sticky_note_2_outlined, text: b.note, italic: true),
                SupplierEarningLine(b),
                if (mainLabel != null) ...[
                  const SizedBox(height: 14),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton.icon(
                      style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(50)),
                      onPressed: () => _run(context, mainAction!),
                      icon: Icon(mainIcon),
                      label: Text(mainLabel),
                    ),
                  ),
                ],
                if (b.status == BookingStatus.accepted || b.status == BookingStatus.onTheWay) ...[
                  const SizedBox(height: 4),
                  if (b.location != null && !arrived) ...[
                    const SizedBox(height: 8),
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(46)),
                        onPressed: () => location.openDirections(b.location!),
                        icon: const Icon(Icons.directions),
                        label: Text(l10n.navigate),
                      ),
                    ),
                  ],
                  Wrap(
                    spacing: 4,
                    children: [
                      TextButton.icon(
                        onPressed: () => callPhone(b.callPhone),
                        icon: const Icon(Icons.call_outlined, size: 20),
                        label: Text('${l10n.call} ${b.callName ?? ''}'.trim()),
                      ),
                      if (!arrived)
                        TextButton.icon(
                          onPressed: () => _askLate(context, b),
                          icon: const Icon(Icons.schedule, size: 20),
                          label: Text(l10n.runningLate),
                        ),
                      if (b.status == BookingStatus.accepted)
                        TextButton(
                          style: TextButton.styleFrom(foregroundColor: Brand.muted),
                          onPressed: () => _run(context, () => bookings.setStatus(b.id, BookingStatus.pending)),
                          child: Text(l10n.release),
                        ),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  /// "Running late": pick how late, and the customer is told.
  Future<void> _askLate(BuildContext context, Booking b) async {
    final l10n = context.l10n;
    final bookings = context.read<BookingRepository>();
    final minutes = await showModalBottomSheet<int>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(l10n.howLate, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            for (final m in const [15, 30, 60])
              ListTile(
                leading: const Icon(Icons.schedule),
                title: Text(l10n.lateMinutes(m)),
                onTap: () => Navigator.pop(context, m),
              ),
          ],
        ),
      ),
    );
    if (minutes == null || !context.mounted) return;
    await _run(context, () async {
      await bookings.reportLate(b.id, minutes);
      if (context.mounted) showMessage(context, l10n.lateTold);
    });
  }
}

/// One line of job information with an icon.
class _Info extends StatelessWidget {
  const _Info({required this.icon, required this.text, this.italic = false});

  final IconData icon;
  final String text;
  final bool italic;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 6),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 18, color: Brand.muted),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            text,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(fontStyle: italic ? FontStyle.italic : null),
          ),
        ),
      ],
    ),
  );
}

/// A small coloured label, e.g. "Arrived" or "Running 15 min late".
class _Tag extends StatelessWidget {
  const _Tag({required this.icon, required this.label, required this.color});

  final IconData icon;
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
    decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(20)),
    child: Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 14, color: color),
        const SizedBox(width: 4),
        Text(
          label,
          style: TextStyle(color: color, fontWeight: FontWeight.w700, fontSize: 12.5),
        ),
      ],
    ),
  );
}
