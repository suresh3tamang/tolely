import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:tolely/core/l10n/l10n.dart';
import 'package:tolely/core/utils/format.dart';
import 'package:tolely/core/utils/phone.dart';
import 'package:tolely/core/widgets/feedback.dart';
import 'package:tolely/features/booking/data/booking_repository.dart';
import 'package:tolely/features/booking/domain/booking.dart';
import 'package:tolely/features/booking/presentation/book_screen.dart';
import 'package:tolely/features/booking/presentation/booking_detail_screen.dart';
import 'package:tolely/features/booking/presentation/booking_labels.dart';
import 'package:tolely/features/booking/presentation/status_chip.dart';
import 'package:tolely/features/catalog/data/catalog_repository.dart';
import 'package:tolely/features/profile/domain/user_profile.dart';

/// One booking in the customer's list: status, supplier, cancel, rate, book again.
class BookingCard extends StatelessWidget {
  const BookingCard(this.booking, {super.key, required this.profile});

  final Booking booking;
  final UserProfile profile;

  /// Opens the booking form with the same service, option and map pin.
  Future<void> _bookAgain(BuildContext context) async {
    final catalog = context.read<CatalogRepository>();
    final unavailable = context.l10n.serviceUnavailable;
    try {
      final services = await catalog.services();
      final match = services.where((s) => s.key == booking.serviceKey);
      if (!context.mounted) return;
      if (match.isEmpty) return showMessage(context, unavailable); // switched off since
      await Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => BookScreen(
            service: match.first,
            profile: profile,
            optionId: booking.optionId,
            location: booking.location,
          ),
        ),
      );
    } catch (e) {
      if (context.mounted) showError(context, e);
    }
  }

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
    final b = booking;
    final bookings = context.read<BookingRepository>();
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => BookingDetailScreen(bookingId: b.id, asSupplier: false)),
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
              Text('${rupees(b.price)} · ${l10n.paymentLabel(b.paymentMethod)}', style: text.bodyMedium),
              if (b.supplierName != null) ...[
                const Divider(),
                Row(
                  children: [
                    const Icon(Icons.person, size: 20),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        [b.supplierName, b.vehicleNo].whereType<String>().where((s) => s.isNotEmpty).join(' · '),
                      ),
                    ),
                    TextButton.icon(
                      onPressed: () => callPhone(b.supplierPhone),
                      icon: const Icon(Icons.call),
                      label: Text(l10n.call),
                    ),
                  ],
                ),
              ],
              if (b.status == BookingStatus.pending || b.status == BookingStatus.accepted)
                Align(
                  alignment: Alignment.centerRight,
                  child: TextButton(
                    onPressed: () => _run(context, () => bookings.cancel(b.id)),
                    child: Text(l10n.cancel),
                  ),
                ),
              if (b.status == BookingStatus.completed) ...[
                const Divider(),
                if (b.rating == null) Text(l10n.rate),
                Row(
                  children: [
                    for (var star = 1; star <= 5; star++)
                      IconButton(
                        icon: Icon(star <= (b.rating ?? 0) ? Icons.star : Icons.star_border, color: Colors.amber),
                        onPressed: b.rating != null ? null : () => _run(context, () => bookings.rate(b.id, star)),
                      ),
                  ],
                ),
              ],
              if (!b.isOpen)
                Align(
                  alignment: Alignment.centerRight,
                  child: TextButton.icon(
                    icon: const Icon(Icons.replay),
                    label: Text(l10n.bookAgain),
                    onPressed: () => _bookAgain(context),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
