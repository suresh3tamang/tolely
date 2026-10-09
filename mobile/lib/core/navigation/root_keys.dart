import 'package:flutter/material.dart';

/// Lets code that has no BuildContext (a tapped notification) open a screen.
final rootNavigatorKey = GlobalKey<NavigatorState>();

/// Lets code that has no BuildContext show a message (a push that arrives while the app is open).
final rootMessengerKey = GlobalKey<ScaffoldMessengerState>();
