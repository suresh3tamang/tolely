import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../api.dart';
import '../i18n.dart';
import '../models.dart';
import 'common.dart';

/// Supplier side: open jobs to accept, and their own jobs to move forward.
class SupplierHome extends StatelessWidget {
  const SupplierHome({super.key, required this.supplier, required this.onRefresh});
  final Map<String, dynamic> supplier;
  final VoidCallback onRefresh;

  @override
  Widget build(BuildContext context) {
    final verified = supplier['verified'] == true;
    final services = List<String>.from(supplier['services'] ?? []);
    final db = FirebaseFirestore.instance.collection('bookings');
    final uid = FirebaseAuth.instance.currentUser!.uid;

    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: Text(supplier['name'] ?? tr('appName')),
          actions: appBarActions(),
          bottom: TabBar(tabs: [Tab(text: tr('availableJobs')), Tab(text: tr('myJobs'))]),
        ),
        body: !verified
            ? RefreshIndicator(
                onRefresh: () async => onRefresh(),
                child: ListView(padding: const EdgeInsets.all(24), children: [
                  const Icon(Icons.hourglass_top, size: 56),
                  const SizedBox(height: 12),
                  Text(tr('notVerified'), textAlign: TextAlign.center),
                ]),
              )
            : TabBarView(children: [
                _JobList(
                  query: db.where('status', isEqualTo: 'pending').orderBy('scheduledFor'),
                  filter: (b) => services.contains(b.serviceKey),
                ),
                _JobList(
                  query: db.where('supplierId', isEqualTo: uid).orderBy('scheduledFor'),
                  // Finished jobs stay visible for a week.
                  filter: (b) =>
                      !const {'completed', 'cancelled'}.contains(b.status) ||
                      b.scheduledFor.isAfter(DateTime.now().subtract(const Duration(days: 7))),
                ),
              ]),
      ),
    );
  }
}

class _JobList extends StatelessWidget {
  const _JobList({required this.query, required this.filter});
  final Query<Map<String, dynamic>> query;
  final bool Function(Booking) filter;

  @override
  Widget build(BuildContext context) {
    return StreamBuilder(
      stream: query.limit(100).snapshots(),
      builder: (context, snap) {
        if (snap.hasError) return Center(child: Text(snap.error.toString()));
        if (!snap.hasData) return const Center(child: CircularProgressIndicator());
        final jobs = snap.data!.docs.map(Booking.fromDoc).where(filter).toList();
        if (jobs.isEmpty) return Center(child: Text(tr('noJobs')));
        return ListView.builder(
          padding: const EdgeInsets.all(12),
          itemCount: jobs.length,
          itemBuilder: (context, i) => _JobCard(jobs[i]),
        );
      },
    );
  }
}

class _JobCard extends StatelessWidget {
  const _JobCard(this.b);
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
            Text('${b.address}${b.landmark.isEmpty ? '' : ' · ${b.landmark}'}'),
            if (b.note.isNotEmpty) Text('“${b.note}”', style: text.bodySmall),
            Text('${rupees(b.price)} · ${tr(b.paymentMethod)}', style: text.titleSmall),
            const SizedBox(height: 8),
            Wrap(spacing: 8, runSpacing: 8, children: [
              if (b.status == 'pending')
                FilledButton(onPressed: () => _run(context, () => Api.acceptJob(b.id)), child: Text(tr('accept'))),
              if (b.status != 'pending') ...[
                OutlinedButton.icon(
                  onPressed: () => callPhone(b.customerPhone),
                  icon: const Icon(Icons.call),
                  label: Text('${tr('call')} ${b.customerName ?? ''}'),
                ),
                if (b.status == 'accepted') ...[
                  FilledButton(
                    onPressed: () => _run(context, () => Api.setJobStatus(b.id, 'on_the_way')),
                    child: Text(tr('startTrip')),
                  ),
                  TextButton(
                    onPressed: () => _run(context, () => Api.setJobStatus(b.id, 'pending')),
                    child: Text(tr('release')),
                  ),
                ],
                if (b.status == 'on_the_way')
                  FilledButton(
                    onPressed: () => _run(context, () => Api.setJobStatus(b.id, 'completed')),
                    child: Text(tr('markDone')),
                  ),
              ],
            ]),
          ],
        ),
      ),
    );
  }
}
