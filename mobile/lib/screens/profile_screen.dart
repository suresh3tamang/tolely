import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';

import '../api.dart';
import '../i18n.dart';
import '../models.dart';
import '../push.dart';
import 'common.dart';

/// Customer profile: edit name, address, language; delete account.
class CustomerProfile extends StatefulWidget {
  const CustomerProfile({super.key, required this.profile});
  final Map<String, dynamic> profile;

  @override
  State<CustomerProfile> createState() => _CustomerProfileState();
}

class _CustomerProfileState extends State<CustomerProfile> {
  late final _name = TextEditingController(text: widget.profile['name'] ?? '');
  late final _address = TextEditingController(text: widget.profile['address'] ?? '');
  late final _landmark = TextEditingController(text: widget.profile['landmark'] ?? '');
  bool _busy = false;

  Future<void> _save() async {
    if (_name.text.trim().isEmpty || _address.text.trim().isEmpty) return showError(context, tr('required'));
    setState(() => _busy = true);
    try {
      await Api.saveCustomerProfile(name: _name.text, address: _address.text, landmark: _landmark.text);
      // Keep the booking form's prefilled address in sync.
      widget.profile
        ..['name'] = _name.text.trim()
        ..['address'] = _address.text.trim()
        ..['landmark'] = _landmark.text.trim();
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(tr('saved'))));
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text(FirebaseAuth.instance.currentUser?.phoneNumber ?? '', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 16),
        TextField(
          controller: _name,
          decoration: InputDecoration(labelText: tr('name')),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _address,
          decoration: InputDecoration(labelText: tr('address')),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _landmark,
          decoration: InputDecoration(labelText: tr('landmark')),
        ),
        const SizedBox(height: 16),
        const LanguagePicker(),
        const SizedBox(height: 16),
        FilledButton(
          onPressed: _busy ? null : _save,
          style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(48)),
          child: Text(tr('save')),
        ),
        const SizedBox(height: 32),
        const DeleteAccountButton(),
      ],
    );
  }
}

/// Supplier "Me" tab: stats and earnings from their completed jobs.
class SupplierProfile extends StatelessWidget {
  const SupplierProfile({super.key, required this.supplier, required this.onEdit});
  final Map<String, dynamic> supplier;
  final VoidCallback onEdit;

  @override
  Widget build(BuildContext context) {
    final uid = FirebaseAuth.instance.currentUser!.uid;
    final ratingCount = (supplier['ratingCount'] as num?)?.toInt() ?? 0;
    final ratingSum = (supplier['ratingSum'] as num?)?.toDouble() ?? 0;
    final rating = ratingCount == 0 ? '—' : '${(ratingSum / ratingCount).toStringAsFixed(1)} ★';
    final jobs = FirebaseFirestore.instance
        .collection('bookings')
        .where('supplierId', isEqualTo: uid)
        .where('status', isEqualTo: 'completed')
        .orderBy('scheduledFor', descending: true)
        .limit(100)
        .snapshots();

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        ListTile(
          contentPadding: EdgeInsets.zero,
          leading: const CircleAvatar(child: Icon(Icons.person)),
          title: Text(supplier['name'] ?? '', style: Theme.of(context).textTheme.titleLarge),
          subtitle: Text('${supplier['phone'] ?? ''}\n${supplier['area'] ?? ''}'),
          isThreeLine: true,
        ),
        if (supplier['verified'] == true)
          Row(
            children: [
              const Icon(Icons.verified, color: Colors.green, size: 20),
              const SizedBox(width: 6),
              Text(tr('verifiedBadge')),
            ],
          ),
        const SizedBox(height: 16),
        StreamBuilder(
          stream: jobs,
          builder: (context, snap) {
            final done = snap.data?.docs.map(Booking.fromDoc).toList() ?? [];
            final now = DateTime.now();
            final month = done
                .where((b) => b.scheduledFor.year == now.year && b.scheduledFor.month == now.month)
                .fold(0, (acc, b) => acc + b.price);
            final total = done.fold(0, (acc, b) => acc + b.price);
            return Wrap(
              spacing: 12,
              runSpacing: 12,
              children: [
                _Stat(label: tr('completedJobs'), value: '${supplier['completedJobs'] ?? 0}'),
                _Stat(label: tr('ratingLabel'), value: rating),
                _Stat(label: tr('earnedThisMonth'), value: rupees(month)),
                _Stat(label: tr('earnedTotal'), value: rupees(total)),
              ],
            );
          },
        ),
        const SizedBox(height: 24),
        const LanguagePicker(),
        const SizedBox(height: 16),
        OutlinedButton.icon(onPressed: onEdit, icon: const Icon(Icons.edit), label: Text(tr('profile'))),
        Padding(
          padding: const EdgeInsets.only(top: 4),
          child: Text(tr('supplierEditWarning'), style: Theme.of(context).textTheme.bodySmall),
        ),
        const SizedBox(height: 32),
        const DeleteAccountButton(),
      ],
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => SizedBox(
    width: (MediaQuery.sizeOf(context).width - 44) / 2,
    child: Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: Theme.of(context).textTheme.bodySmall),
            const SizedBox(height: 4),
            Text(value, style: Theme.of(context).textTheme.titleLarge),
          ],
        ),
      ),
    ),
  );
}

class LanguagePicker extends StatelessWidget {
  const LanguagePicker({super.key});

  @override
  Widget build(BuildContext context) => Row(
    children: [
      Text(tr('languageLabel')),
      const SizedBox(width: 16),
      SegmentedButton<String>(
        segments: const [
          ButtonSegment(value: 'ne', label: Text('नेपाली')),
          ButtonSegment(value: 'en', label: Text('English')),
        ],
        selected: {language.value},
        onSelectionChanged: (v) => language.value = v.first,
      ),
    ],
  );
}

class DeleteAccountButton extends StatelessWidget {
  const DeleteAccountButton({super.key});

  Future<void> _delete(BuildContext context) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(tr('deleteAccount')),
        content: Text(tr('deleteConfirm')),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: Text(tr('back'))),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () => Navigator.pop(context, true),
            child: Text(tr('confirm')),
          ),
        ],
      ),
    );
    if (ok != true || !context.mounted) return;
    try {
      await Push.stop();
      await Api.deleteAccount();
      await FirebaseAuth.instance.signOut();
    } catch (e) {
      if (context.mounted) showError(context, e);
    }
  }

  @override
  Widget build(BuildContext context) => TextButton.icon(
    style: TextButton.styleFrom(foregroundColor: Colors.red),
    onPressed: () => _delete(context),
    icon: const Icon(Icons.delete_forever),
    label: Text(tr('deleteAccount')),
  );
}
