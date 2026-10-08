import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';

import 'config.dart';
import 'firebase_options.dart';
import 'i18n.dart';
import 'push.dart';
import 'theme.dart';
import 'screens/login_screen.dart';
import 'screens/role_gate.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  if (useEmulators) {
    final host = Uri.parse(apiBaseUrl).host; // same machine as the backend
    await FirebaseAuth.instance.useAuthEmulator(host, 9099);
    FirebaseFirestore.instance.useFirestoreEmulator(host, 8080);
  }
  runApp(const TolelyApp());
}

class TolelyApp extends StatelessWidget {
  const TolelyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder(
      valueListenable: language,
      builder: (context, _, _) => MaterialApp(
        title: 'Tolely',
        debugShowCheckedModeBanner: false,
        scaffoldMessengerKey: messengerKey,
        theme: buildTheme(),
        home: StreamBuilder<User?>(
          stream: FirebaseAuth.instance.authStateChanges(),
          builder: (context, snap) {
            if (snap.connectionState == ConnectionState.waiting) {
              return const Scaffold(body: Center(child: CircularProgressIndicator()));
            }
            return snap.data == null ? const LoginScreen() : RoleGate(key: ValueKey(snap.data!.uid));
          },
        ),
      ),
    );
  }
}
