import 'dart:async';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';

import 'api.dart';

/// Lets push messages that arrive while the app is open show as a snackbar.
final messengerKey = GlobalKey<ScaffoldMessengerState>();

/// Push notifications: registers this phone with the backend and, for
/// verified suppliers, subscribes to new-job alerts for their services.
class Push {
  static StreamSubscription<String>? _tokenSub;
  static StreamSubscription<RemoteMessage>? _messageSub;
  static Set<String> _topics = {};

  /// Registers this phone for notifications. Shows the system permission
  /// prompt only when [ask] is true, so call it with `ask: true` at a moment
  /// where the reason is clear (after a first booking, when going online).
  /// Without [ask], it only continues if permission was already given.
  static Future<void> start({List<String> supplierServices = const [], bool ask = false}) async {
    try {
      final fcm = FirebaseMessaging.instance;
      final perm = ask ? await fcm.requestPermission() : await fcm.getNotificationSettings();
      final status = perm.authorizationStatus;
      if (status != AuthorizationStatus.authorized && status != AuthorizationStatus.provisional) return;

      final token = await fcm.getToken();
      if (token != null) await Api.registerDevice(token);
      _tokenSub ??= fcm.onTokenRefresh.listen((t) => Api.registerDevice(t).catchError((_) {}));

      _messageSub ??= FirebaseMessaging.onMessage.listen((m) {
        final n = m.notification;
        if (n == null) return;
        messengerKey.currentState?.showSnackBar(
          SnackBar(content: Text([n.title, n.body].whereType<String>().join('\n'))),
        );
      });

      final wanted = supplierServices.map((s) => 'jobs_$s').toSet();
      for (final t in wanted.difference(_topics)) {
        await fcm.subscribeToTopic(t);
      }
      for (final t in _topics.difference(wanted)) {
        await fcm.unsubscribeFromTopic(t);
      }
      _topics = wanted;
    } catch (e) {
      // Notifications are optional: the app works without them.
      debugPrint('Push setup failed: $e');
    }
  }

  /// Call before logging out so this phone stops getting the user's alerts.
  static Future<void> stop() async {
    try {
      final fcm = FirebaseMessaging.instance;
      final token = await fcm.getToken();
      if (token != null) await Api.registerDevice(token, remove: true);
      for (final t in _topics) {
        await fcm.unsubscribeFromTopic(t);
      }
    } catch (e) {
      debugPrint('Push cleanup failed: $e');
    }
    _topics = {};
  }
}

Future<void> logOut() async {
  await Push.stop();
  await FirebaseAuth.instance.signOut();
}
