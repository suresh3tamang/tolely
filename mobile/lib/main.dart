import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:tolely/app/app.dart';
import 'package:tolely/app/app_providers.dart';
import 'package:tolely/core/config/env.dart';
import 'package:tolely/firebase_options.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  if (Env.useEmulators) {
    final host = Uri.parse(Env.apiBaseUrl).host; // same machine as the backend
    await FirebaseAuth.instance.useAuthEmulator(host, 9099);
    FirebaseFirestore.instance.useFirestoreEmulator(host, 8080);
  }
  final dependencies = await AppDependencies.create();
  runApp(dependencies.provide(child: const TolelyApp()));
}
