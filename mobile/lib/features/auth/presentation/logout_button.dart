import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:tolely/core/l10n/l10n.dart';
import 'package:tolely/core/services/push_service.dart';
import 'package:tolely/features/auth/data/auth_repository.dart';

/// Signs out (and stops this phone's notifications for the account).
class LogoutButton extends StatelessWidget {
  const LogoutButton({super.key});

  @override
  Widget build(BuildContext context) => OutlinedButton.icon(
    style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(48)),
    onPressed: () async {
      final push = context.read<PushService>();
      final auth = context.read<AuthRepository>();
      await push.stop();
      await auth.signOut();
    },
    icon: const Icon(Icons.logout),
    label: Text(context.l10n.logout),
  );
}
