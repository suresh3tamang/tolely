import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../api.dart';
import '../i18n.dart';
import '../models.dart';
import 'book_screen.dart';
import 'common.dart';

class CustomerHome extends StatefulWidget {
  const CustomerHome({super.key, required this.profile});
  final Map<String, dynamic> profile;

  @override
  State<CustomerHome> createState() => _CustomerHomeState();
}

class _CustomerHomeState extends State<CustomerHome> {
  int _tab = 0;
  late final Future<List<Service>> _services = Api.services();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(tr('appName')), actions: appBarActions()),
      body: _tab == 0 ? _servicesGrid() : const _MyBookings(),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _tab,
        onDestinationSelected: (i) => setState(() => _tab = i),
        destinations: [
          NavigationDestination(icon: const Icon(Icons.home), label: tr('home')),
          NavigationDestination(icon: const Icon(Icons.receipt_long), label: tr('myBookings')),
        ],
      ),
    );
  }

  Widget _servicesGrid() => FutureBuilder(
        future: _services,
        builder: (context, snap) {
          if (snap.hasError) return Center(child: Text(snap.error.toString()));
          if (!snap.hasData) return const Center(child: CircularProgressIndicator());
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Text(tr('whatDoYouNeed'), style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 16),
              GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                mainAxisSpacing: 12,
                crossAxisSpacing: 12,
                children: [
                  for (final s in snap.data!)
                    Card(
                      clipBehavior: Clip.antiAlias,
                      child: InkWell(
                        onTap: () async {
                          final booked = await Navigator.push<bool>(
                            context,
                            MaterialPageRoute(builder: (_) => BookScreen(service: s, profile: widget.profile)),
                          );
                          if (booked == true) setState(() => _tab = 1);
                        },
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(serviceIcons[s.icon], size: 44, color: Theme.of(context).colorScheme.primary),
                            const SizedBox(height: 8),
                            Text(s.name, style: Theme.of(context).textTheme.titleMedium),
                            Text('${rupees(s.options.first.price)}+', style: Theme.of(context).textTheme.bodySmall),
                          ],
                        ),
                      ),
                    ),
                ],
              ),
            ],
          );
        },
      );
}

/// Live list of the customer's bookings, updated from Firestore.
class _MyBookings extends StatelessWidget {
  const _MyBookings();

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
          itemBuilder: (context, i) => _BookingCard(bookings[i]),
        );
      },
    );
  }
}

class _BookingCard extends StatelessWidget {
  const _BookingCard(this.b);
  final Booking b;

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
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [
              Expanded(child: Text('${b.serviceName} · ${b.optionLabel}', style: text.titleMedium)),
              StatusChip(b.status),
            ]),
            const SizedBox(height: 6),
            Text(DateFormat('EEE, d MMM · h:mm a').format(b.scheduledFor)),
            Text('${rupees(b.price)} · ${tr(b.paymentMethod)}', style: text.bodyMedium),
            if (b.supplierName != null) ...[
              const Divider(),
              Row(children: [
                const Icon(Icons.person, size: 20),
                const SizedBox(width: 6),
                Expanded(child: Text([b.supplierName, b.vehicleNo].whereType<String>().where((s) => s.isNotEmpty).join(' · '))),
                TextButton.icon(
                  onPressed: () => callPhone(b.supplierPhone),
                  icon: const Icon(Icons.call),
                  label: Text(tr('call')),
                ),
              ]),
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
              Row(children: [
                for (var star = 1; star <= 5; star++)
                  IconButton(
                    icon: Icon(star <= (b.rating ?? 0) ? Icons.star : Icons.star_border, color: Colors.amber),
                    onPressed: b.rating != null ? null : () => _run(context, () => Api.rateBooking(b.id, star)),
                  ),
              ]),
            ],
          ],
        ),
      ),
    );
  }
}
