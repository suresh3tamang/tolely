import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:tolely/core/l10n/l10n.dart';
import 'package:tolely/core/services/push_service.dart';
import 'package:tolely/core/widgets/feedback.dart';
import 'package:tolely/features/auth/data/auth_repository.dart';
import 'package:tolely/features/profile/data/profile_repository.dart';

/// Permanently deletes the account after asking to confirm
/// (required by Google Play and the App Store).
class DeleteAccountButton extends StatelessWidget {
  const DeleteAccountButton({super.key});

  Future<void> _delete(BuildContext context) async {
    final l10n = context.l10n;
    final push = context.read<PushService>();
    final profile = context.read<ProfileRepository>();
    final auth = context.read<AuthRepository>();

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text(l10n.deleteAccount),
        content: Text(l10n.deleteConfirm),
        actions: [
          TextButton(onPressed: () => Navigator.pop(dialogContext, false), child: Text(l10n.back)),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Colors.red, minimumSize: const Size(0, 44)),
            onPressed: () => Navigator.pop(dialogContext, true),
            child: Text(l10n.confirm),
          ),
        ],
      ),
    );
    if (confirmed != true || !context.mounted) return;
    try {
      await push.stop();
      await profile.deleteAccount();
      await auth.signOut();
    } catch (e) {
      if (context.mounted) showError(context, e);
    }
  }

  @override
  Widget build(BuildContext context) => TextButton.icon(
    style: TextButton.styleFrom(foregroundColor: Colors.red),
    onPressed: () => _delete(context),
    icon: const Icon(Icons.delete_forever),
    label: Text(context.l10n.deleteAccount),
  );
}
