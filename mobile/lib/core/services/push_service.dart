import 'dart:async';

import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';

/// Registers this phone for push notifications and, for verified suppliers,
/// subscribes to new-job alerts for their services.
///
/// Provided through `Provider`. The device token is sent to the backend by
/// [registerDevice], which the app shell wires to the profile repository.
class PushService {
  PushService({required this.registerDevice, this.onForegroundMessage});

  /// The booking a notification is about, if it carries one.
  static String? bookingIdOf(RemoteMessage message) {
    final id = message.data['bookingId'];
    return id is String && id.isNotEmpty ? id : null;
  }

  /// Sends (or with `remove: true`, removes) this phone's token on the server.
  final Future<void> Function(String token, {bool remove}) registerDevice;

  /// Called with the text (and booking id, if any) of a message that arrives while the app is open.
  final void Function(String text, String? bookingId)? onForegroundMessage;

  /// Opens a booking. Set by the screen that knows who is signed in, so a
  /// tapped notification lands on the right view (customer or supplier).
  void Function(String bookingId)? onOpenBooking;

  void openBooking(String bookingId) => onOpenBooking?.call(bookingId);

  /// The person tapped a notification (or the app was opened from one).
  void handleOpened(RemoteMessage message) {
    final id = bookingIdOf(message);
    if (id != null) openBooking(id);
  }

  StreamSubscription<String>? _tokenSub;
  StreamSubscription<RemoteMessage>? _messageSub;
  StreamSubscription<RemoteMessage>? _openedSub;
  Set<String> _topics = {};

  /// Starts notifications. The system permission prompt is shown only when
  /// [ask] is true, so call it with `ask: true` at a moment where the reason is
  /// clear (after a first booking, when a supplier goes online). Without
  /// [ask] it only continues if permission was already given.
  Future<void> start({List<String> supplierServices = const [], bool ask = false}) async {
    try {
      final fcm = FirebaseMessaging.instance;
      final settings = ask ? await fcm.requestPermission() : await fcm.getNotificationSettings();
      final status = settings.authorizationStatus;
      if (status != AuthorizationStatus.authorized && status != AuthorizationStatus.provisional) return;

      final token = await fcm.getToken();
      if (token != null) await registerDevice(token);
      _tokenSub ??= fcm.onTokenRefresh.listen((t) => registerDevice(t).catchError((_) {}));

      _messageSub ??= FirebaseMessaging.onMessage.listen((message) {
        final n = message.notification;
        if (n == null) return;
        onForegroundMessage?.call([n.title, n.body].whereType<String>().join('\n'), bookingIdOf(message));
      });

      // Tapping a notification opens its booking, also when it started the app.
      _openedSub ??= FirebaseMessaging.onMessageOpenedApp.listen(handleOpened);
      final launchedBy = await fcm.getInitialMessage();
      if (launchedBy != null) handleOpened(launchedBy);

      final wanted = supplierServices.map((s) => 'jobs_$s').toSet();
      for (final topic in wanted.difference(_topics)) {
        await fcm.subscribeToTopic(topic);
      }
      for (final topic in _topics.difference(wanted)) {
        await fcm.unsubscribeFromTopic(topic);
      }
      _topics = wanted;
    } catch (e) {
      // Notifications are optional: the app works without them.
      debugPrint('Push setup failed: $e');
    }
  }

  /// Call before signing out so this phone stops getting the user's alerts.
  Future<void> stop() async {
    try {
      final fcm = FirebaseMessaging.instance;
      final token = await fcm.getToken();
      if (token != null) await registerDevice(token, remove: true);
      for (final topic in _topics) {
        await fcm.unsubscribeFromTopic(topic);
      }
    } catch (e) {
      debugPrint('Push cleanup failed: $e');
    }
    _topics = {};
  }
}
