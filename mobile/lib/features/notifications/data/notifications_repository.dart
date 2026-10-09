import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:tolely/core/network/api_client.dart';
import 'package:tolely/features/notifications/domain/app_notification.dart';

/// The bell: the person's notifications, live from Firestore (read-only for the app), newest first.
/// Marking them seen goes through the backend, so the count also goes away on the website.
class NotificationsRepository {
  NotificationsRepository(this._api, [FirebaseFirestore? firestore]) : _db = firestore ?? FirebaseFirestore.instance;

  final ApiClient _api;
  final FirebaseFirestore _db;

  Stream<List<AppNotification>> watch(String uid, {int limit = 50}) => _db
      .collection('users')
      .doc(uid)
      .collection('notifications')
      .orderBy('createdAt', descending: true)
      .limit(limit)
      .snapshots()
      .map((snap) => [for (final d in snap.docs) AppNotification.fromMap(d.id, d.data())]);

  Future<void> markSeen(List<String> ids) async {
    if (ids.isEmpty) return;
    await _api.post('/api/me/notifications/seen', {'ids': ids});
  }
}
