import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:tolely/core/l10n/l10n.dart';
import 'package:tolely/core/services/push_service.dart';
import 'package:tolely/core/theme/brand.dart';
import 'package:tolely/core/widgets/language_button.dart';
import 'package:tolely/features/customer/presentation/home_tab.dart';
import 'package:tolely/features/customer/presentation/my_bookings_tab.dart';
import 'package:tolely/features/profile/domain/user_profile.dart';
import 'package:tolely/features/profile/presentation/customer_profile_tab.dart';

/// The customer's app: Home, My bookings and Profile tabs.
class CustomerHome extends StatefulWidget {
  const CustomerHome({super.key, required this.profile});

  final UserProfile profile;

  @override
  State<CustomerHome> createState() => _CustomerHomeState();
}

class _CustomerHomeState extends State<CustomerHome> {
  static const _home = 0, _bookings = 1;

  int _tab = _home;
  late UserProfile _user = widget.profile;
  Timer? _askTimer;

  @override
  void dispose() {
    _askTimer?.cancel();
    super.dispose();
  }

  void _onBooked() {
    setState(() => _tab = _bookings);
    // A good moment to ask: they want to hear when a supplier accepts. Wait for
    // the screen change to finish before the system prompt appears.
    final push = context.read<PushService>();
    _askTimer?.cancel();
    _askTimer = Timer(const Duration(milliseconds: 800), () => push.start(ask: true));
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return Scaffold(
      // The Home tab draws its own header; the others use a simple title bar.
      appBar: _tab == _home
          ? null
          : AppBar(title: Text(_tab == _bookings ? l10n.myBookings : l10n.profile), actions: appBarActions()),
      body: switch (_tab) {
        _home => HomeTab(profile: _user, onBooked: _onBooked),
        _bookings => MyBookingsTab(profile: _user),
        _ => CustomerProfileTab(profile: _user, onSaved: (saved) => setState(() => _user = saved)),
      },
      bottomNavigationBar: DecoratedBox(
        decoration: const BoxDecoration(
          border: Border(top: BorderSide(color: Brand.line)),
        ),
        child: NavigationBar(
          selectedIndex: _tab,
          onDestinationSelected: (i) {
            HapticFeedback.selectionClick();
            setState(() => _tab = i);
          },
          destinations: [
            NavigationDestination(
              icon: const Icon(Icons.home_outlined),
              selectedIcon: const Icon(Icons.home_rounded),
              label: l10n.home,
            ),
            NavigationDestination(
              icon: const Icon(Icons.receipt_long_outlined),
              selectedIcon: const Icon(Icons.receipt_long),
              label: l10n.myBookings,
            ),
            NavigationDestination(
              icon: const Icon(Icons.person_outline),
              selectedIcon: const Icon(Icons.person),
              label: l10n.profile,
            ),
          ],
        ),
      ),
    );
  }
}
