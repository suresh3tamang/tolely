import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:tolely/core/l10n/l10n.dart';
import 'package:tolely/core/theme/brand.dart';
import 'package:tolely/core/utils/format.dart';
import 'package:tolely/core/widgets/pressable.dart';
import 'package:tolely/features/auth/data/auth_repository.dart';
import 'package:tolely/features/booking/data/booking_repository.dart';
import 'package:tolely/features/booking/domain/booking.dart';
import 'package:tolely/features/booking/presentation/booking_detail_screen.dart';
import 'package:tolely/features/booking/presentation/booking_labels.dart';

/// Shows the customer's latest open booking at the top of Home.
class ActiveBookingCard extends StatelessWidget {
  const ActiveBookingCard({super.key});

  @override
  Widget build(BuildContext context) {
    final uid = context.read<AuthRepository>().currentUid!;
    return StreamBuilder<List<Booking>>(
      stream: context.read<BookingRepository>().watchCustomerBookings(uid, limit: 5),
      builder: (context, snapshot) {
        final open = (snapshot.data ?? const <Booking>[]).where((b) => b.isOpen).toList();
        if (open.isEmpty) return const SizedBox.shrink();
        final b = open.first;
        final text = Theme.of(context).textTheme;
        return Padding(
          padding: const EdgeInsets.only(bottom: 24),
          child: Pressable(
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => BookingDetailScreen(bookingId: b.id, asSupplier: false)),
            ),
            child: Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                gradient: const LinearGradient(colors: [Brand.blue, Brand.deepBlue]),
                borderRadius: BorderRadius.circular(22),
                boxShadow: [
                  BoxShadow(color: Brand.blue.withValues(alpha: 0.3), blurRadius: 20, offset: const Offset(0, 10)),
                ],
              ),
              child: Row(
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Icon(
                      b.status == BookingStatus.onTheWay ? Icons.local_shipping : Icons.schedule,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          context.l10n.statusLabel(b.status),
                          style: text.titleMedium?.copyWith(color: Colors.white),
                        ),
                        Text(
                          '${context.text(b.serviceName)} · ${formatDayTime(b.scheduledFor)}',
                          style: text.bodyMedium?.copyWith(color: Colors.white.withValues(alpha: 0.85)),
                        ),
                      ],
                    ),
                  ),
                  const Icon(Icons.chevron_right, color: Colors.white),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}
