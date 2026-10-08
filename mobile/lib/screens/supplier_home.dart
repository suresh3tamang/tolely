import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';

import 'dart:async';

import 'package:intl/intl.dart';

import '../api.dart';
import '../i18n.dart';
import '../location.dart';
import '../models.dart';
import '../push.dart';
import 'booking_detail_screen.dart';
import 'common.dart';
import 'profile_screen.dart';
import 'profile_setup_screen.dart';

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

    final waiting = RefreshIndicator(
      onRefresh: () async => onRefresh(),
      child: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          const Icon(Icons.hourglass_top, size: 56),
          const SizedBox(height: 12),
          Text(tr('notVerified'), textAlign: TextAlign.center),
        ],
      ),
    );

    void editDetails() => Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => ProfileSetupScreen(
          supplier: supplier,
          onDone: () {
            Navigator.pop(context);
            onRefresh();
          },
        ),
      ),
    );

    return DefaultTabController(
      length: 3,
      child: Scaffold(
        appBar: AppBar(
          title: Text(supplier['name'] ?? tr('appName')),
          actions: [
            if (verified) _OnlineSwitch(supplier: supplier, onChanged: onRefresh),
            ...appBarActions(),
          ],
          bottom: TabBar(
            tabs: [
              Tab(text: tr('availableJobs')),
              Tab(text: tr('myJobs')),
              Tab(text: tr('me')),
            ],
          ),
        ),
        body: Column(
          children: [
            if (verified && supplier['online'] == false)
              MaterialBanner(
                content: Text(tr('offlineHint')),
                leading: const Icon(Icons.notifications_off),
                actions: const [SizedBox.shrink()],
              ),
            if (verified) _LocationSharer(uid: uid),
            Expanded(
              child: TabBarView(
                children: [
                  if (!verified) ...[
                    waiting,
                    waiting,
                  ] else ...[
                    _JobList(
                      query: db.where('status', isEqualTo: 'pending').orderBy('scheduledFor'),
                      filter: (b) => services.contains(b.serviceKey),
                    ),
                    _JobList(
                      // Newest 100 first from the server, then shown soonest-first.
                      query: db.where('supplierId', isEqualTo: uid).orderBy('scheduledFor', descending: true),
                      soonestFirst: true,
                      // Finished jobs stay visible for a week.
                      filter: (b) =>
                          b.isOpen || b.scheduledFor.isAfter(DateTime.now().subtract(const Duration(days: 7))),
                    ),
                  ],
                  SupplierProfile(supplier: supplier, onEdit: editDetails),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _JobList extends StatelessWidget {
  const _JobList({required this.query, required this.filter, this.soonestFirst = false});
  final Query<Map<String, dynamic>> query;
  final bool Function(Booking) filter;
  final bool soonestFirst;

  @override
  Widget build(BuildContext context) {
    return StreamBuilder(
      stream: query.limit(100).snapshots(),
      builder: (context, snap) {
        if (snap.hasError) return Center(child: Text(snap.error.toString()));
        if (!snap.hasData) return const Center(child: CircularProgressIndicator());
        final jobs = snap.data!.docs.map(Booking.fromDoc).where(filter).toList();
        if (soonestFirst) jobs.sort((a, b) => a.scheduledFor.compareTo(b.scheduledFor));
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
                  Expanded(child: Text('${b.serviceName} · ${b.optionLabel}', style: text.titleMedium)),
                  StatusChip(b.status),
                ],
              ),
              const SizedBox(height: 6),
              Text(DateFormat('EEE, d MMM · h:mm a').format(b.scheduledFor)),
              Text('${b.address}${b.landmark.isEmpty ? '' : ' · ${b.landmark}'}'),
              if (b.note.isNotEmpty) Text('“${b.note}”', style: text.bodySmall),
              Text('${rupees(b.price)} · ${tr(b.paymentMethod)}', style: text.titleSmall),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
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
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Online / offline switch in the app bar. Offline suppliers get no new-job alerts.
class _OnlineSwitch extends StatefulWidget {
  const _OnlineSwitch({required this.supplier, required this.onChanged});
  final Map<String, dynamic> supplier;
  final VoidCallback onChanged;

  @override
  State<_OnlineSwitch> createState() => _OnlineSwitchState();
}

class _OnlineSwitchState extends State<_OnlineSwitch> {
  late bool _online = widget.supplier['online'] != false;
  bool _busy = false;

  Future<void> _set(bool online) async {
    setState(() {
      _online = online;
      _busy = true;
    });
    try {
      await Api.setOnline(online);
      await Push.start(supplierServices: online ? List<String>.from(widget.supplier['services'] ?? []) : const []);
      widget.onChanged();
    } catch (e) {
      if (mounted) {
        setState(() => _online = !online);
        showError(context, e);
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      Text(tr(_online ? 'online' : 'offline'), style: Theme.of(context).textTheme.labelMedium),
      Switch(value: _online, activeThumbColor: Colors.green, onChanged: _busy ? null : _set),
    ],
  );
}

/// While the supplier has a job "on the way", sends their position every
/// 20 seconds so the customer can follow them on the map. Works while the app
/// is open.
class _LocationSharer extends StatefulWidget {
  const _LocationSharer({required this.uid});
  final String uid;

  @override
  State<_LocationSharer> createState() => _LocationSharerState();
}

class _LocationSharerState extends State<_LocationSharer> {
  StreamSubscription<QuerySnapshot<Map<String, dynamic>>>? _sub;
  Timer? _timer;
  List<String> _jobIds = [];

  @override
  void initState() {
    super.initState();
    _sub = FirebaseFirestore.instance
        .collection('bookings')
        .where('supplierId', isEqualTo: widget.uid)
        .where('status', isEqualTo: 'on_the_way')
        .snapshots()
        .listen((snap) {
          final ids = snap.docs.map((d) => d.id).toList();
          final wasSharing = _jobIds.isNotEmpty;
          setState(() => _jobIds = ids);
          if (ids.isNotEmpty && !wasSharing) {
            _send();
            _timer = Timer.periodic(const Duration(seconds: 20), (_) => _send());
          } else if (ids.isEmpty) {
            _timer?.cancel();
            _timer = null;
          }
        });
  }

  Future<void> _send() async {
    final at = await currentLatLng();
    if (at == null) return;
    for (final id in _jobIds) {
      await Api.shareLocation(id, at).catchError((_) {});
    }
  }

  @override
  void dispose() {
    _sub?.cancel();
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_jobIds.isEmpty) return const SizedBox.shrink();
    return Container(
      width: double.infinity,
      color: Colors.green.shade50,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      child: Row(
        children: [
          Icon(Icons.my_location, size: 18, color: Colors.green.shade700),
          const SizedBox(width: 8),
          Expanded(
            child: Text(tr('sharingLocation'), style: TextStyle(color: Colors.green.shade900)),
          ),
        ],
      ),
    );
  }
}
