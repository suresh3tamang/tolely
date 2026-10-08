import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';

import '../i18n.dart';
import 'common.dart';

/// Phone number + OTP login. Nepal numbers only (+977).
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _phone = TextEditingController();
  final _code = TextEditingController();
  String? _verificationId;
  bool _busy = false;

  Future<void> _sendCode() async {
    final digits = _phone.text.replaceAll(RegExp(r'\D'), '');
    if (digits.length != 10) return showError(context, tr('phoneTitle'));
    setState(() => _busy = true);
    await FirebaseAuth.instance.verifyPhoneNumber(
      phoneNumber: '+977$digits',
      verificationCompleted: (cred) => FirebaseAuth.instance.signInWithCredential(cred), // Android auto-read
      verificationFailed: (e) {
        setState(() => _busy = false);
        showError(context, e.message ?? e.code);
      },
      codeSent: (id, _) => setState(() {
        _verificationId = id;
        _busy = false;
      }),
      codeAutoRetrievalTimeout: (_) {},
    );
  }

  Future<void> _verify() async {
    setState(() => _busy = true);
    try {
      await FirebaseAuth.instance.signInWithCredential(
        PhoneAuthProvider.credential(verificationId: _verificationId!, smsCode: _code.text.trim()),
      );
    } on FirebaseAuthException catch (e) {
      if (mounted) showError(context, e.message ?? e.code);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final codeStep = _verificationId != null;
    return Scaffold(
      appBar: AppBar(actions: const [LanguageButton()]),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            Center(
              child: ClipRRect(
                borderRadius: BorderRadius.circular(22),
                child: Image.asset('assets/icon/icon.png', width: 96, height: 96),
              ),
            ),
            const SizedBox(height: 8),
            Text(tr('appName'), textAlign: TextAlign.center, style: Theme.of(context).textTheme.headlineMedium),
            const SizedBox(height: 32),
            Text(tr(codeStep ? 'otpTitle' : 'phoneTitle'), style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 12),
            if (!codeStep)
              TextField(
                controller: _phone,
                keyboardType: TextInputType.phone,
                maxLength: 10,
                decoration: InputDecoration(prefixText: '+977 ', hintText: tr('phoneHint')),
              )
            else
              TextField(controller: _code, keyboardType: TextInputType.number, maxLength: 6),
            const SizedBox(height: 12),
            FilledButton(
              onPressed: _busy ? null : (codeStep ? _verify : _sendCode),
              style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(52)),
              child: _busy
                  ? const SizedBox.square(dimension: 22, child: CircularProgressIndicator(strokeWidth: 2))
                  : Text(tr(codeStep ? 'verify' : 'sendCode')),
            ),
          ],
        ),
      ),
    );
  }
}
