import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:tolely/core/l10n/l10n.dart';
import 'package:tolely/core/utils/format.dart';
import 'package:tolely/features/auth/data/auth_repository.dart';
import 'package:tolely/features/auth/presentation/logout_button.dart';
import 'package:tolely/features/booking/data/booking_repository.dart';
import 'package:tolely/features/booking/domain/booking.dart';
import 'package:tolely/features/profile/domain/supplier_account.dart';
import 'package:tolely/features/profile/presentation/delete_account_button.dart';
import 'package:tolely/features/profile/presentation/language_picker.dart';

/// Supplier "Me" tab: stats and earnings from their completed jobs.
class SupplierProfileTab extends StatelessWidget {
  const SupplierProfileTab({super.key, required this.supplier, required this.onEdit});

  final SupplierAccount supplier;
  final VoidCallback onEdit;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final uid = context.read<AuthRepository>().currentUid!;
    final average = supplier.averageRating;
    final rating = average == null ? '—' : '${average.toStringAsFixed(1)} ★';

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        ListTile(
          contentPadding: EdgeInsets.zero,
          leading: const CircleAvatar(child: Icon(Icons.person)),
          title: Text(supplier.name, style: Theme.of(context).textTheme.titleLarge),
          subtitle: Text('${supplier.phone}\n${supplier.area}'),
          isThreeLine: true,
        ),
        if (supplier.verified)
          Row(
            children: [
              const Icon(Icons.verified, color: Colors.green, size: 20),
              const SizedBox(width: 6),
              Text(l10n.verifiedBadge),
            ],
          ),
        const SizedBox(height: 16),
        StreamBuilder<List<Booking>>(
          stream: context.read<BookingRepository>().watchCompletedJobs(uid),
          builder: (context, snapshot) {
            final done = snapshot.data ?? const <Booking>[];
            final now = DateTime.now();
            final month = done
                .where((b) => b.scheduledFor.year == now.year && b.scheduledFor.month == now.month)
                .fold(0, (sum, b) => sum + b.supplierEarning);
            final total = done.fold(0, (sum, b) => sum + b.supplierEarning);
            return Wrap(
              spacing: 12,
              runSpacing: 12,
              children: [
                _Stat(label: l10n.completedJobs, value: '${supplier.completedJobs}'),
                _Stat(label: l10n.ratingLabel, value: rating),
                _Stat(label: l10n.earnedThisMonth, value: rupees(month)),
                _Stat(label: l10n.earnedTotal, value: rupees(total)),
              ],
            );
          },
        ),
        if (supplier.feeBalance > 0) ...[const SizedBox(height: 12), _OwedCard(amount: supplier.feeBalance)],
        const SizedBox(height: 24),
        const LanguagePicker(),
        const SizedBox(height: 16),
        OutlinedButton.icon(onPressed: onEdit, icon: const Icon(Icons.edit), label: Text(l10n.editDetails)),
        Padding(
          padding: const EdgeInsets.only(top: 4),
          child: Text(l10n.supplierEditWarning, style: Theme.of(context).textTheme.bodySmall),
        ),
        const SizedBox(height: 24),
        const LogoutButton(),
        const SizedBox(height: 8),
        const DeleteAccountButton(),
      ],
    );
  }
}

/// Platform fees the supplier still owes Tolely. Customers pay suppliers directly,
/// so the fee on each job is paid to Tolely afterwards.
class _OwedCard extends StatelessWidget {
  const _OwedCard({required this.amount});

  final int amount;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final text = Theme.of(context).textTheme;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFFFF7E6),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFFDE7B0)),
      ),
      child: Row(
        children: [
          const Icon(Icons.account_balance_wallet_outlined, color: Color(0xFFB45309)),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('${l10n.owedToTolely}: ${rupees(amount)}', style: text.titleMedium),
                Text(l10n.owedHelp, style: text.bodySmall),
              ],
            ),
          ),
        ],
      ),
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
