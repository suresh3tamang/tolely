import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:tolely/core/l10n/l10n.dart';
import 'package:tolely/core/services/push_service.dart';
import 'package:tolely/core/theme/brand.dart';
import 'package:tolely/core/utils/format.dart';
import 'package:tolely/features/auth/data/auth_repository.dart';
import 'package:tolely/features/notifications/data/notifications_repository.dart';
import 'package:tolely/features/notifications/domain/app_notification.dart';

IconData _icon(String type) => switch (type) {
  'accepted' || 'completed' => Icons.check_circle_outline,
  'on_the_way' => Icons.local_shipping_outlined,
  'near' || 'arrived' => Icons.place_outlined,
  'late' || 'delayed' || 'reminder' => Icons.schedule,
  'cancelled' => Icons.cancel_outlined,
  'new_job' => Icons.work_outline,
  _ => Icons.notifications_none,
};

/// Every update, newest first. The unseen ones are highlighted and marked seen once shown here.
class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  final _marked = <String>{};
  Stream<List<AppNotification>>? _stream;

  @override
  void initState() {
    super.initState();
    // Its own live list (a Firestore stream can be listened to only once, and the bell is using one).
    final uid = context.read<AuthRepository>().currentUid;
    if (uid != null) _stream = context.read<NotificationsRepository>().watch(uid);
  }

  /// Seen once the list is open: the bell's count goes away (here and on the website).
  void _markSeen(List<AppNotification> items) {
    final ids = [for (final n in items) if (!n.seen && !_marked.contains(n.id)) n.id];
    if (ids.isEmpty) return;
    _marked.addAll(ids);
    context.read<NotificationsRepository>().markSeen(ids).catchError((_) {});
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final text = Theme.of(context).textTheme;
    return Scaffold(
      appBar: AppBar(title: Text(l10n.notifications)),
      body: StreamBuilder<List<AppNotification>>(
        stream: _stream,
        builder: (context, snapshot) {
          final items = snapshot.data;
          if (items == null) return const Center(child: CircularProgressIndicator());
          if (items.isEmpty) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Text(l10n.noNotifications, textAlign: TextAlign.center, style: text.bodyLarge),
              ),
            );
          }
          WidgetsBinding.instance.addPostFrameCallback((_) => mounted ? _markSeen(items) : null);
          return ListView.separated(
            itemCount: items.length,
            separatorBuilder: (_, _) => const Divider(height: 1),
            itemBuilder: (context, i) {
              final n = items[i];
              return ListTile(
                tileColor: n.seen ? null : Colors.blue.shade50,
                leading: CircleAvatar(
                  backgroundColor: Colors.blue.shade100,
                  child: Icon(_icon(n.type), color: Brand.deepBlue),
                ),
                title: Text(context.text(n.title), style: text.titleSmall),
                subtitle: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(context.text(n.body)),
                    if (n.createdAt != null)
                      Text(formatShortDateTime(n.createdAt!), style: text.bodySmall?.copyWith(color: Brand.muted)),
                  ],
                ),
                isThreeLine: true,
                onTap: n.bookingId == null
                    ? null
                    : () {
                        Navigator.pop(context);
                        context.read<PushService>().openBooking(n.bookingId!);
                      },
              );
            },
          );
        },
      ),
    );
  }
}
