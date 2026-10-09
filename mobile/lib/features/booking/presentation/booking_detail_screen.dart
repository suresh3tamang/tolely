import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:tolely/core/l10n/l10n.dart';
import 'package:tolely/core/services/location_service.dart';
import 'package:tolely/core/utils/format.dart';
import 'package:tolely/core/utils/phone.dart';
import 'package:tolely/core/widgets/feedback.dart';
import 'package:tolely/features/booking/data/booking_repository.dart';
import 'package:tolely/features/booking/domain/booking.dart';
import 'package:tolely/features/booking/presentation/booking_labels.dart';
import 'package:tolely/features/booking/presentation/booking_money.dart';
import 'package:tolely/features/booking/presentation/booking_timeline.dart';
import 'package:tolely/features/booking/presentation/report_problem_dialog.dart';
import 'package:tolely/features/booking/presentation/status_chip.dart';
import 'package:tolely/features/map/presentation/booking_map.dart';

/// Live view of one booking with a status timeline. Used by customers and suppliers.
class BookingDetailScreen extends StatelessWidget {
  const BookingDetailScreen({super.key, required this.bookingId, required this.asSupplier});

  final String bookingId;

  /// True when the supplier is looking at their job (shows the customer's
  /// contact and directions instead of the supplier's).
  final bool asSupplier;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(context.l10n.details)),
      body: StreamBuilder<Booking?>(
        stream: context.read<BookingRepository>().watchBooking(bookingId),
        builder: (context, snapshot) {
          if (snapshot.hasError) return Center(child: Text(errorMessage(context, snapshot.error!)));
          final booking = snapshot.data;
          if (booking == null) return const Center(child: CircularProgressIndicator());
          return _Details(booking: booking, asSupplier: asSupplier);
        },
      ),
    );
  }
}

class _Details extends StatelessWidget {
  const _Details({required this.booking, required this.asSupplier});

  final Booking booking;
  final bool asSupplier;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final text = Theme.of(context).textTheme;
    final b = booking;
    final otherName = asSupplier ? b.callName : b.supplierName;
    final otherPhone = asSupplier ? b.callPhone : b.supplierPhone;
    // The supplier's position is shared only while they're on the way.
    final live = b.status == BookingStatus.onTheWay ? b.supplierLocation : null;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Row(
          children: [
            Expanded(child: Text(context.text(b.serviceName), style: text.headlineSmall)),
            StatusChip(b.status),
          ],
        ),
        Text(context.text(b.optionLabel), style: text.titleMedium),
        const SizedBox(height: 4),
        Text('${rupees(b.price)} · ${l10n.paymentLabel(b.paymentMethod)}', style: text.titleMedium),
        if (asSupplier) SupplierEarningLine(b),
        const Divider(height: 32),
        _Row(icon: Icons.schedule, label: l10n.scheduled, value: formatWindow(b.scheduledFor, b.scheduledEnd)),
        _Row(
          icon: Icons.place,
          label: l10n.address,
          value: [b.address, b.landmark].where((s) => s.isNotEmpty).join('\n'),
        ),
        if (b.location != null) ...[
          if (!asSupplier && live != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                children: [
                  Icon(Icons.circle, size: 10, color: Colors.green.shade600),
                  const SizedBox(width: 6),
                  Text(l10n.liveTracking, style: text.labelLarge),
                ],
              ),
            ),
          BookingMap(home: b.location!, supplier: live),
          if (asSupplier && b.isOpen)
            Align(
              alignment: Alignment.centerLeft,
              child: TextButton.icon(
                icon: const Icon(Icons.directions),
                label: Text(l10n.directions),
                onPressed: () => context.read<LocationService>().openDirections(b.location!),
              ),
            ),
          const SizedBox(height: 8),
        ],
        if (b.note.isNotEmpty) _Row(icon: Icons.notes, label: l10n.note, value: b.note),
        if (otherName != null)
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.person),
            title: Text(otherName),
            subtitle: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  [
                    asSupplier ? l10n.customer : l10n.supplier,
                    if (!asSupplier) b.vehicleNo,
                  ].whereType<String>().where((s) => s.isNotEmpty).join(' · '),
                ),
                if (!asSupplier) SupplierTrustLine(b),
              ],
            ),
            trailing: IconButton.filledTonal(
              icon: const Icon(Icons.call),
              tooltip: l10n.call,
              onPressed: () => callPhone(otherPhone),
            ),
          ),
        const Divider(height: 32),
        BookingTimeline(b),
        const SizedBox(height: 24),
        OutlinedButton.icon(
          icon: const Icon(Icons.report_problem_outlined),
          label: Text(l10n.reportProblem),
          onPressed: () => reportProblem(context, b.id),
        ),
      ],
    );
  }
}

class _Row extends StatelessWidget {
  const _Row({required this.icon, required this.label, required this.value});

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => ListTile(
    contentPadding: EdgeInsets.zero,
    leading: Icon(icon),
    title: Text(label, style: Theme.of(context).textTheme.bodySmall),
    subtitle: Text(value, style: Theme.of(context).textTheme.bodyLarge),
  );
}
