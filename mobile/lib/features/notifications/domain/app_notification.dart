import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:tolely/core/l10n/localized_text.dart';

/// One update in the bell (users/{uid}/notifications, written by the backend).
class AppNotification {
  const AppNotification({
    required this.id,
    required this.type,
    required this.title,
    required this.body,
    required this.seen,
    this.bookingId,
    this.createdAt,
  });

  factory AppNotification.fromMap(String id, Map<String, dynamic> m) => AppNotification(
    id: id,
    type: m['type'] as String? ?? 'info',
    bookingId: m['bookingId'] as String?,
    title: LocalizedText.fromFields(m, 'title'),
    body: LocalizedText.fromFields(m, 'body'),
    seen: m['seen'] == true,
    createdAt: (m['createdAt'] as Timestamp?)?.toDate(),
  );

  final String id;

  /// accepted, on_the_way, near, arrived, completed, cancelled, late, delayed, reminder, new_job...
  final String type;
  final String? bookingId;
  final LocalizedText title;
  final LocalizedText body;
  final bool seen;
  final DateTime? createdAt;
}
