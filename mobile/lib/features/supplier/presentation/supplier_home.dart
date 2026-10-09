import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:tolely/core/l10n/l10n.dart';
import 'package:tolely/core/widgets/language_button.dart';
import 'package:tolely/features/notifications/presentation/notification_bell.dart';
import 'package:tolely/features/auth/data/auth_repository.dart';
import 'package:tolely/features/booking/data/booking_repository.dart';
import 'package:tolely/features/booking/domain/booking.dart';
import 'package:tolely/features/profile/domain/supplier_account.dart';
import 'package:tolely/features/profile/presentation/profile_setup_screen.dart';
import 'package:tolely/features/profile/presentation/supplier_profile_tab.dart';
import 'package:tolely/features/supplier/presentation/job_list.dart';
import 'package:tolely/features/supplier/presentation/location_sharer.dart';
import 'package:tolely/features/supplier/presentation/online_switch.dart';

/// The supplier's app: open jobs to accept, their own jobs, and their profile.
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
    final verified = supplier.verified;

    final waiting = RefreshIndicator(
      onRefresh: () async => widget.onRefresh(),
      child: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          const Icon(Icons.hourglass_top, size: 56),
          const SizedBox(height: 12),
          Text(l10n.notVerified, textAlign: TextAlign.center),
        ],
      ),
    );

    return DefaultTabController(
      length: 3,
      child: Scaffold(
        appBar: AppBar(
          title: Text(supplier.name),
          actions: [
            if (verified) OnlineSwitch(supplier: supplier, onChanged: widget.onRefresh),
            const NotificationBell(),
            const LanguageButton(),
          ],
          bottom: TabBar(
            tabs: [
              Tab(text: l10n.availableJobs),
              Tab(text: l10n.myJobs),
              Tab(text: l10n.me),
            ],
          ),
        ),
        body: Column(
          children: [
            if (verified && !supplier.online)
              MaterialBanner(
                content: Text(l10n.offlineHint),
                leading: const Icon(Icons.notifications_off),
                actions: const [SizedBox.shrink()],
              ),
            if (verified) LocationSharer(uid: _uid),
            Expanded(
              child: TabBarView(
                children: [
                  if (!verified) ...[
                    waiting,
                    waiting,
                  ] else ...[
                    JobList(stream: _openJobs, filter: (job) => supplier.services.contains(job.serviceKey)),
                    JobList(
                      stream: _myJobs,
                      soonestFirst: true,
                      // Finished jobs stay visible for a week.
                      filter: (job) =>
                          job.isOpen || job.scheduledFor.isAfter(DateTime.now().subtract(const Duration(days: 7))),
                    ),
                  ],
                  SupplierProfileTab(supplier: supplier, onEdit: _editDetails),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
