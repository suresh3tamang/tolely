import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../api.dart';
import '../i18n.dart';
import '../location.dart';
import '../models.dart';
import 'common.dart';
import 'location_picker_screen.dart';

/// Live view of one booking with a status timeline. Used by customers and suppliers.
class BookingDetailScreen extends StatelessWidget {
  const BookingDetailScreen({super.key, required this.bookingId, required this.asSupplier});
  final String bookingId;
  final bool asSupplier;

  @override
  Widget build(BuildContext context) {
    final doc = FirebaseFirestore.instance.collection('bookings').doc(bookingId).snapshots();
    return Scaffold(
      appBar: AppBar(title: Text(tr('details'))),
      body: StreamBuilder(
        stream: doc,
        builder: (context, snap) {
          if (snap.hasError) return Center(child: Text(snap.error.toString()));
          if (!snap.hasData || !snap.data!.exists) return const Center(child: CircularProgressIndicator());
          final b = Booking.fromDoc(snap.data!);
          return _Details(b: b, asSupplier: asSupplier);
        },
      ),
    );
  }
}

class _Details extends StatelessWidget {
  const _Details({required this.b, required this.asSupplier});
  final Booking b;
  final bool asSupplier;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final when = DateFormat('EEE, d MMM · h:mm a');
    final otherName = asSupplier ? b.customerName : b.supplierName;
    final otherPhone = asSupplier ? b.customerPhone : b.supplierPhone;
    // The supplier's position is shared only while they're on the way.
    final live = b.status == 'on_the_way' ? b.supplierLocation : null;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Row(
          children: [
            Expanded(child: Text(b.serviceName, style: text.headlineSmall)),
            StatusChip(b.status),
          ],
        ),
        Text(b.optionLabel, style: text.titleMedium),
        const SizedBox(height: 4),
        Text('${rupees(b.price)} · ${tr(b.paymentMethod)}', style: text.titleMedium),
        const Divider(height: 32),
        _Row(icon: Icons.schedule, label: tr('scheduled'), value: when.format(b.scheduledFor)),
        _Row(
          icon: Icons.place,
          label: tr('address'),
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
                  Text(tr('liveTracking'), style: text.labelLarge),
                ],
              ),
            ),
          BookingMap(home: b.location!, supplier: live),
          if (asSupplier && b.isOpen)
            Align(
              alignment: Alignment.centerLeft,
              child: TextButton.icon(
                icon: const Icon(Icons.directions),
                label: Text(tr('directions')),
                onPressed: () => openDirections(b.location!),
              ),
            ),
          const SizedBox(height: 8),
        ],
        if (b.note.isNotEmpty) _Row(icon: Icons.notes, label: tr('note'), value: b.note),
        if (otherName != null)
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.person),
            title: Text(otherName),
            subtitle: Text(
              [
                tr(asSupplier ? 'customer' : 'supplier'),
                if (!asSupplier) b.vehicleNo,
              ].whereType<String>().where((s) => s.isNotEmpty).join(' · '),
            ),
            trailing: IconButton.filledTonal(
              icon: const Icon(Icons.call),
              tooltip: tr('call'),
              onPressed: () => callPhone(otherPhone),
            ),
          ),
        const Divider(height: 32),
        _Timeline(b: b),
        const SizedBox(height: 24),
        OutlinedButton.icon(
          icon: const Icon(Icons.report_problem_outlined),
          label: Text(tr('reportProblem')),
          onPressed: () => _report(context),
        ),
      ],
    );
  }

  Future<void> _report(BuildContext context) async {
    final controller = TextEditingController();
    final message = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(tr('reportProblem')),
        content: TextField(
          controller: controller,
          autofocus: true,
          maxLines: 4,
          decoration: InputDecoration(hintText: tr('reportHint')),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: Text(tr('cancel'))),
          FilledButton(onPressed: () => Navigator.pop(context, controller.text), child: Text(tr('send'))),
        ],
      ),
    );
    if (message == null || message.trim().isEmpty || !context.mounted) return;
    try {
      await Api.reportProblem(b.id, message.trim());
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(tr('reportSent'))));
      }
    } catch (e) {
      if (context.mounted) showError(context, e);
    }
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

class _Timeline extends StatelessWidget {
  const _Timeline({required this.b});
  final Booking b;

  @override
  Widget build(BuildContext context) {
    final steps = <(String, DateTime?)>[
      ('stepBooked', b.createdAt),
      if (b.status == 'cancelled') ...[
        if (b.acceptedAt != null) ('stepAccepted', b.acceptedAt),
        ('stepCancelled', b.cancelledAt),
      ] else ...[
        ('stepAccepted', b.acceptedAt),
        ('stepOnTheWay', b.departedAt),
        ('stepCompleted', b.completedAt),
      ],
    ];
    // A released job goes back to pending: only "booked" counts as done then.
    final reached = switch (b.status) {
      'pending' => 1,
      'accepted' => 2,
      'on_the_way' => 3,
      _ => steps.length,
    };
    final color = Theme.of(context).colorScheme.primary;
    final fmt = DateFormat('d MMM, h:mm a');

    return Column(
      children: [
        for (var i = 0; i < steps.length; i++)
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Column(
                children: [
                  Icon(
                    i < reached ? Icons.check_circle : Icons.radio_button_unchecked,
                    color: steps[i].$1 == 'stepCancelled' ? Colors.grey : (i < reached ? color : Colors.grey.shade400),
                  ),
                  if (i < steps.length - 1)
                    Container(width: 2, height: 28, color: i + 1 < reached ? color : Colors.grey.shade300),
                ],
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.only(top: 2),
                  child: Text.rich(
                    TextSpan(
                      children: [
                        TextSpan(text: tr(steps[i].$1)),
                        if (i < reached && steps[i].$2 != null)
                          TextSpan(
                            text: '  ${fmt.format(steps[i].$2!)}',
                            style: const TextStyle(color: Colors.grey),
                          ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
      ],
    );
  }
}
