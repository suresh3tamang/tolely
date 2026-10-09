import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:tolely/core/l10n/l10n.dart';
import 'package:tolely/core/theme/brand.dart';
import 'package:tolely/features/auth/data/auth_repository.dart';
import 'package:tolely/features/booking/data/booking_repository.dart';
import 'package:tolely/features/booking/domain/booking.dart';
import 'package:tolely/features/notifications/presentation/notification_bell.dart';
import 'package:tolely/features/profile/domain/supplier_account.dart';
import 'package:tolely/features/profile/presentation/profile_setup_screen.dart';
import 'package:tolely/features/profile/presentation/supplier_profile_tab.dart';
import 'package:tolely/features/supplier/presentation/job_list.dart';
import 'package:tolely/features/supplier/presentation/location_sharer.dart';
import 'package:tolely/features/supplier/presentation/online_switch.dart';
import 'package:tolely/features/supplier/presentation/today_summary.dart';

/// The supplier's app: new jobs to accept, their own jobs, and their profile, with a bottom bar.
class SupplierHome extends StatefulWidget {
  const SupplierHome({super.key, required this.supplier, required this.onRefresh});

  final SupplierAccount supplier;

  /// Reloads the account (e.g. after verification, or after going online).
  final VoidCallback onRefresh;

  @override
  State<SupplierHome> createState() => _SupplierHomeState();
}

class _SupplierHomeState extends State<SupplierHome> {
  // Created once, so rebuilding the screen doesn't restart the database listeners.
  late final String _uid = context.read<AuthRepository>().currentUid!;
  late final Stream<List<Booking>> _openJobs = context.read<BookingRepository>().watchOpenJobs();
  late final Stream<List<Booking>> _myJobs = context.read<BookingRepository>().watchSupplierJobs(_uid);
  // A second live list for the "today" summary (a stream can be listened to only once).
  late final Stream<List<Booking>> _todayJobs = context.read<BookingRepository>().watchSupplierJobs(_uid);
  int _tab = 0;

  /// Online right now: updated as soon as the supplier slides, without waiting for the account to reload.
  late bool _online = widget.supplier.online;

  @override
  void didUpdateWidget(SupplierHome old) {
    super.didUpdateWidget(old);
    if (old.supplier.online != widget.supplier.online) _online = widget.supplier.online;
  }

  void _editDetails() => Navigator.push(
    context,
    MaterialPageRoute(
      builder: (_) => ProfileSetupScreen(
        supplier: widget.supplier,
        onDone: () {
          Navigator.pop(context);
          widget.onRefresh();
        },
      ),
    ),
  );

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final supplier = widget.supplier;
    final text = Theme.of(context).textTheme;

    final pages = [
      if (!supplier.verified)
        _UnderReview(onRefresh: () async => widget.onRefresh())
      else
        JobList(
          stream: _openJobs,
          header: Column(
            children: [
              OnlineSwitch(
                supplier: supplier,
                onChanged: (online) {
                  setState(() => _online = online);
                  widget.onRefresh();
                },
              ),
              TodaySummary(jobs: _todayJobs, rating: supplier.averageRating),
            ],
          ),
          sections: (all) {
            final jobs = _online ? all.where((j) => supplier.services.contains(j.serviceKey)).toList() : <Booking>[];
            return [(title: l10n.jobsAvailable(jobs.length), jobs: jobs)];
          },
          empty: _online
              ? EmptyJobs(icon: Icons.inbox_outlined, title: l10n.noJobsTitle, hint: l10n.noJobsHint)
              : EmptyJobs(icon: Icons.power_settings_new, title: l10n.offlineTitle, hint: l10n.goOnlineToSee),
        ),
      JobList(
        stream: _myJobs,
        sections: (all) {
          final weekAgo = DateTime.now().subtract(const Duration(days: 7));
          final open = all.where((j) => j.isOpen).toList()..sort((a, b) => a.scheduledFor.compareTo(b.scheduledFor));
          final done = all.where((j) => !j.isOpen && j.scheduledFor.isAfter(weekAgo)).toList()
            ..sort((a, b) => b.scheduledFor.compareTo(a.scheduledFor));
          return [(title: l10n.inProgress, jobs: open), (title: l10n.finishedRecently, jobs: done)];
        },
        empty: EmptyJobs(icon: Icons.assignment_outlined, title: l10n.noMyJobsTitle, hint: l10n.noMyJobsHint),
      ),
      SupplierProfileTab(supplier: supplier, onEdit: _editDetails),
    ];

    return Scaffold(
      appBar: AppBar(
        titleSpacing: 16,
        title: Row(
          children: [
            CircleAvatar(
              radius: 18,
              backgroundColor: Brand.blue,
              child: Text(_initials(supplier.name), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 14)),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('${l10n.namaste}, ${supplier.name.split(' ').first}', style: text.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
                  if (supplier.area.isNotEmpty)
                    Text(supplier.area, style: text.bodySmall?.copyWith(color: Brand.muted), overflow: TextOverflow.ellipsis),
                ],
              ),
            ),
          ],
        ),
        actions: const [NotificationBell(), SizedBox(width: 8)],
      ),
      body: Column(
        children: [
          if (supplier.verified) LocationSharer(uid: _uid),
          Expanded(child: IndexedStack(index: _tab, children: pages)),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _tab,
        onDestinationSelected: (i) => setState(() => _tab = i),
        destinations: [
          NavigationDestination(icon: const Icon(Icons.work_outline), selectedIcon: const Icon(Icons.work), label: l10n.navJobs),
          NavigationDestination(icon: const Icon(Icons.assignment_outlined), selectedIcon: const Icon(Icons.assignment), label: l10n.myJobs),
          NavigationDestination(icon: const Icon(Icons.person_outline), selectedIcon: const Icon(Icons.person), label: l10n.navProfile),
        ],
      ),
    );
  }
}

String _initials(String name) =>
    name.trim().split(RegExp(r'\s+')).where((w) => w.isNotEmpty).take(2).map((w) => w[0].toUpperCase()).join();

/// Shown until an admin verifies the supplier: where they are in the process.
class _UnderReview extends StatelessWidget {
  const _UnderReview({required this.onRefresh});

  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final text = Theme.of(context).textTheme;
    final steps = [(l10n.reviewStep1, true), (l10n.reviewStep2, false), (l10n.reviewStep3, false)];
    return RefreshIndicator(
      onRefresh: onRefresh,
      child: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          const SizedBox(height: 24),
          Center(
            child: Container(
              width: 88,
              height: 88,
              decoration: BoxDecoration(color: Brand.amber.withValues(alpha: 0.15), shape: BoxShape.circle),
              child: const Icon(Icons.verified_user_outlined, size: 44, color: Color(0xFFB45309)),
            ),
          ),
          const SizedBox(height: 20),
          Text(l10n.reviewTitle, style: text.titleLarge?.copyWith(fontWeight: FontWeight.w700), textAlign: TextAlign.center),
          const SizedBox(height: 8),
          Text(l10n.notVerified, style: text.bodyMedium?.copyWith(color: Brand.muted), textAlign: TextAlign.center),
          const SizedBox(height: 28),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(18), border: Border.all(color: Brand.line)),
            child: Column(
              children: [
                for (var i = 0; i < steps.length; i++)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    child: Row(
                      children: [
                        Icon(
                          steps[i].$2 ? Icons.check_circle : (i == 1 ? Icons.radio_button_checked : Icons.radio_button_unchecked),
                          color: steps[i].$2 ? Colors.green : (i == 1 ? Brand.blue : Colors.grey.shade400),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            steps[i].$1,
                            style: text.bodyLarge?.copyWith(
                              fontWeight: i == 1 ? FontWeight.w600 : null,
                              color: i == 2 ? Brand.muted : null,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Text(l10n.reviewHint, style: text.bodySmall?.copyWith(color: Brand.muted), textAlign: TextAlign.center),
        ],
      ),
    );
  }
}
