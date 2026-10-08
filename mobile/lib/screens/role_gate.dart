import 'package:flutter/material.dart';

import '../api.dart';
import '../i18n.dart';
import 'customer_home.dart';
import 'profile_setup_screen.dart';
import 'supplier_home.dart';

/// After login: loads the profile and sends the user to the right home screen.
class RoleGate extends StatefulWidget {
  const RoleGate({super.key});

  @override
  State<RoleGate> createState() => _RoleGateState();
}

class _RoleGateState extends State<RoleGate> {
  late Future<Map<String, dynamic>> _me = _load();

  // Applies the saved language once the profile arrives.
  Future<Map<String, dynamic>> _load() => Api.me().then((me) {
        final saved = (me['user'] as Map?)?['language'];
        if (saved is String) language.value = saved;
        return me;
      });

  void _reload() => setState(() => _me = _load());

  @override
  Widget build(BuildContext context) {
    return FutureBuilder(
      future: _me,
      builder: (context, snap) {
        if (snap.hasError) {
          return Scaffold(
            body: Center(
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                Text(snap.error.toString()),
                TextButton(onPressed: _reload, child: const Text('Retry')),
              ]),
            ),
          );
        }
        if (!snap.hasData) return const Scaffold(body: Center(child: CircularProgressIndicator()));

        final user = snap.data!['user'] as Map<String, dynamic>?;
        final supplier = snap.data!['supplier'] as Map<String, dynamic>?;

        switch (user?['role']) {
          case 'customer':
            return CustomerHome(profile: user!);
          case 'supplier':
            return SupplierHome(supplier: supplier!, onRefresh: _reload);
          case 'admin':
            return const Scaffold(body: Center(child: Text('Admins use the web dashboard: /admin')));
          default:
            return ProfileSetupScreen(onDone: _reload);
        }
      },
    );
  }
}
