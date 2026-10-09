import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:tolely/features/auth/data/auth_repository.dart';
import 'package:tolely/features/auth/presentation/login_screen.dart';
import 'package:tolely/features/auth/presentation/session_gate.dart';

/// Shows the login screen when signed out, and the app when signed in.
class AuthGate extends StatelessWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<String?>(
      stream: context.read<AuthRepository>().uidChanges,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Scaffold(body: Center(child: CircularProgressIndicator()));
        }
        final uid = snapshot.data;
        // The key restarts the session screens when a different person signs in.
        return uid == null ? const LoginScreen() : SessionGate(key: ValueKey(uid));
      },
    );
  }
}
