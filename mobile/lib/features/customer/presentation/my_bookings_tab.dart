import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:tolely/core/l10n/l10n.dart';
import 'package:tolely/core/widgets/feedback.dart';
import 'package:tolely/features/auth/data/auth_repository.dart';
import 'package:tolely/features/booking/data/booking_repository.dart';
import 'package:tolely/features/booking/domain/booking.dart';
import 'package:tolely/features/customer/presentation/booking_card.dart';
import 'package:tolely/features/profile/domain/user_profile.dart';

/// Live list of the customer's bookings.
class MyBookingsTab extends StatelessWidget {
  const MyBookingsTab({super.key, required this.profile});

  final UserProfile profile;

  @override
  Widget build(BuildContext context) {
    final uid = context.read<AuthRepository>().currentUid!;
    return StreamBuilder<List<Booking>>(
      stream: context.read<BookingRepository>().watchCustomerBookings(uid),
      builder: (context, snapshot) {
        if (snapshot.hasError) return Center(child: Text(errorMessage(context, snapshot.error!)));
        final bookings = snapshot.data;
        if (bookings == null) return const Center(child: CircularProgressIndicator());
        if (bookings.isEmpty) return Center(child: Text(context.l10n.noBookings));
        return ListView.builder(
          padding: const EdgeInsets.all(12),
          itemCount: bookings.length,
          itemBuilder: (context, i) => BookingCard(bookings[i], profile: profile),
        );
      },
    );
  }
}
