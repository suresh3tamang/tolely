import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:tolely/core/l10n/l10n.dart';
import 'package:tolely/features/auth/data/auth_repository.dart';
import 'package:tolely/features/notifications/data/notifications_repository.dart';
import 'package:tolely/features/notifications/domain/app_notification.dart';
import 'package:tolely/features/notifications/presentation/notifications_screen.dart';

/// Bell icon with a red count of unseen updates. Tapping opens the list (which marks them seen).
class NotificationBell extends StatefulWidget {
  const NotificationBell({super.key});

  @override
  State<NotificationBell> createState() => _NotificationBellState();
}

class _NotificationBellState extends State<NotificationBell> {
  Stream<List<AppNotification>>? _stream;

  @override
  void initState() {
    super.initState();
    final uid = context.read<AuthRepository>().currentUid;
    if (uid != null) _stream = context.read<NotificationsRepository>().watch(uid);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return StreamBuilder<List<AppNotification>>(
      stream: _stream,
      builder: (context, snapshot) {
        final items = snapshot.data ?? const <AppNotification>[];
        final unseen = items.where((n) => !n.seen).length;
        return IconButton(
          tooltip: unseen > 0 ? '${l10n.notifications} ($unseen)' : l10n.notifications,
          onPressed: () => Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const NotificationsScreen()),
          ),
          icon: Badge(
            isLabelVisible: unseen > 0,
            label: Text(unseen > 9 ? '9+' : '$unseen'),
            child: Icon(unseen > 0 ? Icons.notifications_active : Icons.notifications_none),
          ),
        );
      },
    );
  }
}
