import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:tolely/core/l10n/l10n.dart';
import 'package:tolely/core/l10n/locale_controller.dart';
import 'package:tolely/core/navigation/root_keys.dart';
import 'package:tolely/core/services/push_service.dart';
import 'package:tolely/core/widgets/feedback.dart';
import 'package:tolely/features/booking/presentation/booking_detail_screen.dart';
import 'package:tolely/features/customer/presentation/customer_home.dart';
import 'package:tolely/features/profile/data/profile_repository.dart';
import 'package:tolely/features/profile/domain/session.dart';
import 'package:tolely/features/profile/domain/user_profile.dart';
import 'package:tolely/features/profile/presentation/profile_setup_screen.dart';
import 'package:tolely/features/supplier/presentation/supplier_home.dart';

/// After login: loads the profile and shows the right home screen
/// (customer, supplier, or the "choose how you will use Tolely" setup).
class SessionGate extends StatefulWidget {
  const SessionGate({super.key});

  @override
  State<SessionGate> createState() => _SessionGateState();
}

class _SessionGateState extends State<SessionGate> {
  late Future<Session> _session;

  @override
  void initState() {
    super.initState();
    _session = _load();
  }

  Future<Session> _load() async {
    final profiles = context.read<ProfileRepository>();
    final locale = context.read<LocaleController>();
    final push = context.read<PushService>();

    final session = await profiles.session();

    // The server remembers the language across devices; it wins on login.
    final language = session.user?.language;
    if (language != null) await locale.setLanguage(language, sync: false);

    // Only asks for permission later, at a useful moment; this just reconnects
    // phones that already allowed notifications.
    final role = session.role;
    if (role == UserRole.customer || role == UserRole.supplier) {
      // Tapping a notification opens that booking, as seen by this person.
      push.onOpenBooking = (bookingId) => rootNavigatorKey.currentState?.push(
        MaterialPageRoute<void>(
          builder: (_) => BookingDetailScreen(bookingId: bookingId, asSupplier: role == UserRole.supplier),
        ),
      );
      push.start(supplierServices: session.supplier?.alertServices ?? const []);
    }
    return session;
  }

  // Braces matter: setState's callback must not return the Future.
  void _reload() => setState(() {
    _session = _load();
  });

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<Session>(
      future: _session,
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return Scaffold(
            body: Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(errorMessage(context, snapshot.error!), textAlign: TextAlign.center),
                    const SizedBox(height: 12),
                    FilledButton(onPressed: _reload, child: Text(context.l10n.retry)),
                  ],
                ),
              ),
            ),
          );
        }
        final session = snapshot.data;
        if (session == null) return const Scaffold(body: Center(child: CircularProgressIndicator()));

        final user = session.user;
        final supplier = session.supplier;
        return switch (session.role) {
          UserRole.customer when user != null => CustomerHome(profile: user),
          UserRole.supplier when supplier != null => SupplierHome(supplier: supplier, onRefresh: _reload),
          UserRole.admin => Scaffold(body: Center(child: Text(context.l10n.adminUseWeb))),
          _ => ProfileSetupScreen(onDone: _reload),
        };
      },
    );
  }
}
