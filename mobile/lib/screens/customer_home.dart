import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';

import '../api.dart';
import '../i18n.dart';
import '../models.dart';
import '../push.dart';
import '../theme.dart';
import 'book_screen.dart';
import 'booking_detail_screen.dart';
import 'common.dart';
import 'profile_screen.dart';

class CustomerHome extends StatefulWidget {
  const CustomerHome({super.key, required this.profile});
  final Map<String, dynamic> profile;

  @override
  State<CustomerHome> createState() => _CustomerHomeState();
}

class _CustomerHomeState extends State<CustomerHome> {
  int _tab = 0;
  late Future<List<Service>> _services = Api.services();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      // The home tab draws its own header; the others use a simple title bar.
      appBar: _tab == 0
          ? null
          : AppBar(title: Text(tr(_tab == 1 ? 'myBookings' : 'profile')), actions: appBarActions()),
      body: switch (_tab) {
        0 => _homeTab(),
        1 => _MyBookings(profile: widget.profile),
        _ => CustomerProfile(profile: widget.profile),
      },
      bottomNavigationBar: DecoratedBox(
        decoration: const BoxDecoration(
          border: Border(top: BorderSide(color: Brand.line)),
        ),
        child: NavigationBar(
          selectedIndex: _tab,
          onDestinationSelected: (i) {
            HapticFeedback.selectionClick();
            setState(() => _tab = i);
          },
          destinations: [
            NavigationDestination(
              icon: const Icon(Icons.home_outlined),
              selectedIcon: const Icon(Icons.home_rounded),
              label: tr('home'),
            ),
            NavigationDestination(
              icon: const Icon(Icons.receipt_long_outlined),
              selectedIcon: const Icon(Icons.receipt_long),
              label: tr('myBookings'),
            ),
            NavigationDestination(
              icon: const Icon(Icons.person_outline),
              selectedIcon: const Icon(Icons.person),
              label: tr('profile'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _book(Service s) async {
    final booked = await Navigator.push<bool>(
      context,
      MaterialPageRoute(
        builder: (_) => BookScreen(service: s, profile: widget.profile),
      ),
    );
    if (booked == true) {
      setState(() => _tab = 1);
      // Good moment to ask: they want to hear when a supplier accepts.
      // Wait for the screen change to finish before the system prompt.
      Future.delayed(const Duration(milliseconds: 800), () => Push.start(ask: true));
    }
  }

  Widget _homeTab() {
    final text = Theme.of(context).textTheme;
    final firstName = (widget.profile['name'] as String? ?? '').trim().split(' ').first;
    final area = widget.profile['address'] as String? ?? '';

    return SafeArea(
      bottom: false,
      child: RefreshIndicator(
        onRefresh: () async {
          final next = Api.services();
          setState(() {
            _services = next;
          });
          await next;
        },
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
          children: [
            // Greeting header
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('${tr('namaste')}, $firstName 👋', style: text.headlineSmall),
                      if (area.isNotEmpty) ...[
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            const Icon(Icons.location_on, size: 16, color: Brand.amber),
                            const SizedBox(width: 4),
                            Flexible(
                              child: Text(
                                area,
                                overflow: TextOverflow.ellipsis,
                                style: text.bodyMedium?.copyWith(color: Brand.muted),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
                const LanguageButton(),
              ],
            ),
            const SizedBox(height: 20),
            _ActiveBooking(onOpenBookings: () => setState(() => _tab = 1)),
            Text(tr('whatDoYouNeed'), style: text.titleLarge),
            const SizedBox(height: 12),
            FutureBuilder(
              future: _services,
              builder: (context, snap) {
                if (snap.hasError) return Text(snap.error.toString());
                if (!snap.hasData) {
                  return const Padding(
                    padding: EdgeInsets.all(32),
                    child: Center(child: CircularProgressIndicator()),
                  );
                }
                return GridView.count(
                  crossAxisCount: 2,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  mainAxisSpacing: 14,
                  crossAxisSpacing: 14,
                  childAspectRatio: 0.95,
                  children: [for (final s in snap.data!) _ServiceTile(service: s, onTap: () => _book(s))],
                );
              },
            ),
            const SizedBox(height: 20),
            const _TipBanner(),
          ],
        ),
      ),
    );
  }
}

class _ServiceTile extends StatelessWidget {
  const _ServiceTile({required this.service, required this.onTap});
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
            Text(service.name, style: text.titleMedium, maxLines: 2, overflow: TextOverflow.ellipsis),
            const SizedBox(height: 2),
            Row(
              children: [
                Text(fromPrice(service.options.first.price), style: text.bodySmall?.copyWith(color: Brand.muted)),
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

/// Shows the customer's latest open booking at the top of Home.
class _ActiveBooking extends StatelessWidget {
  const _ActiveBooking({required this.onOpenBookings});
  final VoidCallback onOpenBookings;

  @override
  Widget build(BuildContext context) {
    final stream = FirebaseFirestore.instance
        .collection('bookings')
        .where('customerId', isEqualTo: FirebaseAuth.instance.currentUser!.uid)
        .orderBy('createdAt', descending: true)
        .limit(5)
        .snapshots();

    return StreamBuilder(
      stream: stream,
      builder: (context, snap) {
        final open = snap.data?.docs.map(Booking.fromDoc).where((b) => b.isOpen).toList() ?? [];
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
                    child: Icon(b.status == 'on_the_way' ? Icons.local_shipping : Icons.schedule, color: Colors.white),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(tr('status_${b.status}'), style: text.titleMedium?.copyWith(color: Colors.white)),
                        Text(
                          '${b.serviceName} · ${DateFormat('EEE, h:mm a').format(b.scheduledFor)}',
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

class _TipBanner extends StatelessWidget {
  const _TipBanner();

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: const Color(0xFFFFF7E6),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: const Color(0xFFFDE7B0)),
      ),
      child: Row(
        children: [
          const Text('💧', style: TextStyle(fontSize: 32)),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(tr('tipTitle'), style: text.titleMedium),
                Text(tr('tipBody'), style: text.bodyMedium?.copyWith(color: Brand.muted)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Live list of the customer's bookings, updated from Firestore.
class _MyBookings extends StatelessWidget {
  const _MyBookings({required this.profile});
  final Map<String, dynamic> profile;

  @override
  Widget build(BuildContext context) {
    final stream = FirebaseFirestore.instance
        .collection('bookings')
        .where('customerId', isEqualTo: FirebaseAuth.instance.currentUser!.uid)
        .orderBy('createdAt', descending: true)
        .limit(50)
        .snapshots();

    return StreamBuilder(
      stream: stream,
      builder: (context, snap) {
        if (snap.hasError) return Center(child: Text(snap.error.toString()));
        if (!snap.hasData) return const Center(child: CircularProgressIndicator());
        final bookings = snap.data!.docs.map(Booking.fromDoc).toList();
        if (bookings.isEmpty) return Center(child: Text(tr('noBookings')));
        return ListView.builder(
          padding: const EdgeInsets.all(12),
          itemCount: bookings.length,
          itemBuilder: (context, i) => _BookingCard(bookings[i], profile: profile),
        );
      },
    );
  }
}

class _BookingCard extends StatelessWidget {
  const _BookingCard(this.b, {required this.profile});
  final Booking b;
  final Map<String, dynamic> profile;

  /// Opens the booking form with the same service, option and map pin.
  Future<void> _bookAgain(BuildContext context) async {
    try {
      final service = (await Api.services()).firstWhere((s) => s.key == b.serviceKey);
      if (!context.mounted) return;
      await Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => BookScreen(service: service, profile: profile, optionId: b.optionId, location: b.location),
        ),
      );
    } on StateError {
      // The service was switched off since this booking.
      if (context.mounted) showError(context, tr('serviceUnavailable'));
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
    final text = Theme.of(context).textTheme;
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
                  Expanded(child: Text('${b.serviceName} · ${b.optionLabel}', style: text.titleMedium)),
                  StatusChip(b.status),
                ],
              ),
              const SizedBox(height: 6),
              Text(DateFormat('EEE, d MMM · h:mm a').format(b.scheduledFor)),
              Text('${rupees(b.price)} · ${tr(b.paymentMethod)}', style: text.bodyMedium),
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
                      label: Text(tr('call')),
                    ),
                  ],
                ),
              ],
              if (b.status == 'pending' || b.status == 'accepted')
                Align(
                  alignment: Alignment.centerRight,
                  child: TextButton(
                    onPressed: () => _run(context, () => Api.cancelBooking(b.id)),
                    child: Text(tr('cancel')),
                  ),
                ),
              if (b.status == 'completed') ...[
                const Divider(),
                if (b.rating == null) Text(tr('rate')),
                Row(
                  children: [
                    for (var star = 1; star <= 5; star++)
                      IconButton(
                        icon: Icon(star <= (b.rating ?? 0) ? Icons.star : Icons.star_border, color: Colors.amber),
                        onPressed: b.rating != null ? null : () => _run(context, () => Api.rateBooking(b.id, star)),
                      ),
                  ],
                ),
              ],
              if (!b.isOpen)
                Align(
                  alignment: Alignment.centerRight,
                  child: TextButton.icon(
                    icon: const Icon(Icons.replay),
                    label: Text(tr('bookAgain')),
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
