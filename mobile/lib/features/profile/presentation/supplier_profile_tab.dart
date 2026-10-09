import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:tolely/core/l10n/l10n.dart';
import 'package:tolely/core/theme/brand.dart';
import 'package:tolely/core/utils/format.dart';
import 'package:tolely/features/auth/data/auth_repository.dart';
import 'package:tolely/features/auth/presentation/logout_button.dart';
import 'package:tolely/features/booking/data/booking_repository.dart';
import 'package:tolely/features/booking/domain/booking.dart';
import 'package:tolely/features/profile/domain/supplier_account.dart';
import 'package:tolely/features/profile/presentation/delete_account_button.dart';
import 'package:tolely/features/profile/presentation/language_picker.dart';

/// Supplier profile tab: who they are, stats and earnings, and settings.
class SupplierProfileTab extends StatelessWidget {
  const SupplierProfileTab({super.key, required this.supplier, required this.onEdit});

  final SupplierAccount supplier;
  final VoidCallback onEdit;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final text = Theme.of(context).textTheme;
    final uid = context.read<AuthRepository>().currentUid!;
    final average = supplier.averageRating;
    final rating = average == null ? '—' : average.toStringAsFixed(1);
    final initials = supplier.name.trim().split(RegExp(r'\s+')).where((w) => w.isNotEmpty).take(2).map((w) => w[0].toUpperCase()).join();

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
      children: [
        // Who they are
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            gradient: const LinearGradient(colors: [Brand.blue, Brand.deepBlue], begin: Alignment.topLeft, end: Alignment.bottomRight),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Row(
            children: [
              CircleAvatar(
                radius: 30,
                backgroundColor: Colors.white,
                child: Text(initials, style: const TextStyle(color: Brand.deepBlue, fontWeight: FontWeight.w800, fontSize: 20)),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(supplier.name, style: text.titleLarge?.copyWith(color: Colors.white, fontWeight: FontWeight.w700)),
                    Text(supplier.phone, style: text.bodyMedium?.copyWith(color: Colors.white70)),
                    if (supplier.area.isNotEmpty) Text(supplier.area, style: text.bodyMedium?.copyWith(color: Colors.white70)),
                    if (supplier.verified) ...[
                      const SizedBox(height: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.18), borderRadius: BorderRadius.circular(20)),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.verified, color: Colors.white, size: 16),
                            const SizedBox(width: 4),
                            Text(l10n.verifiedBadge, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 12.5)),
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        // How they are doing
        StreamBuilder<List<Booking>>(
          stream: context.read<BookingRepository>().watchCompletedJobs(uid),
          builder: (context, snapshot) {
            final done = snapshot.data ?? const <Booking>[];
            final now = DateTime.now();
            final month = done
                .where((b) => b.scheduledFor.year == now.year && b.scheduledFor.month == now.month)
                .fold(0, (sum, b) => sum + b.supplierEarning);
            final total = done.fold(0, (sum, b) => sum + b.supplierEarning);
            return Column(
              children: [
                Row(
                  children: [
                    Expanded(child: _Stat(icon: Icons.task_alt, label: l10n.completedJobs, value: '${supplier.completedJobs}')),
                    const SizedBox(width: 12),
                    Expanded(child: _Stat(icon: Icons.star_outline, label: l10n.ratingLabel, value: rating)),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(child: _Stat(icon: Icons.calendar_month_outlined, label: l10n.earnedThisMonth, value: rupees(month))),
                    const SizedBox(width: 12),
                    Expanded(child: _Stat(icon: Icons.payments_outlined, label: l10n.earnedTotal, value: rupees(total))),
                  ],
                ),
              ],
            );
          },
        ),
        if (supplier.feeBalance > 0) ...[const SizedBox(height: 12), _OwedCard(amount: supplier.feeBalance)],
        const SizedBox(height: 20),
        // Settings
        // A Material (not a coloured box) so the rows show their tap ripple.
        Material(
          color: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18), side: const BorderSide(color: Brand.line)),
          clipBehavior: Clip.antiAlias,
          child: Column(
            children: [
              Padding(padding: const EdgeInsets.fromLTRB(16, 14, 16, 14), child: const LanguagePicker()),
              const Divider(height: 1),
              ListTile(
                leading: const Icon(Icons.edit_outlined),
                title: Text(l10n.editDetails),
                subtitle: Text(l10n.supplierEditWarning),
                trailing: const Icon(Icons.chevron_right),
                onTap: onEdit,
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),
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
  const _Stat({required this.icon, required this.label, required this.value});

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: Brand.line)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 20, color: Brand.blue),
          const SizedBox(height: 8),
          Text(value, style: text.titleLarge?.copyWith(fontWeight: FontWeight.w800)),
          Text(label, style: text.bodySmall?.copyWith(color: Brand.muted), maxLines: 2),
        ],
      ),
    );
  }
}
