import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:tolely/core/l10n/l10n.dart';
import 'package:tolely/core/theme/brand.dart';
import 'package:tolely/core/widgets/feedback.dart';
import 'package:tolely/core/widgets/language_button.dart';
import 'package:tolely/features/auth/data/auth_repository.dart';

/// Phone number + SMS code login. Nepal numbers only (+977).
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

  @override
  void dispose() {
    _phone.dispose();
    _code.dispose();
    super.dispose();
  }

  Future<void> _sendCode() async {
    final digits = _phone.text.replaceAll(RegExp(r'\D'), '');
    if (digits.length != 10) return showMessage(context, context.l10n.invalidPhone);
    setState(() => _busy = true);
    await context.read<AuthRepository>().sendCode(
      digits,
      onCodeSent: (id) {
        if (!mounted) return;
        setState(() {
          _verificationId = id;
          _busy = false;
        });
      },
      onFailed: (failure) {
        if (!mounted) return;
        setState(() => _busy = false);
        showError(context, failure);
      },
    );
  }

  Future<void> _verify() async {
    setState(() => _busy = true);
    try {
      await context.read<AuthRepository>().confirmCode(verificationId: _verificationId!, code: _code.text.trim());
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final codeStep = _verificationId != null;
    final text = Theme.of(context).textTheme;
    return Scaffold(
      backgroundColor: Brand.deepBlue,
      body: Column(
        children: [
          // Brand header
          Expanded(
            flex: 5,
            child: Container(
              width: double.infinity,
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [Color(0xFF0EA5E9), Brand.deepBlue],
                ),
              ),
              child: SafeArea(
                bottom: false,
                child: Column(
                  children: [
                    const Align(alignment: Alignment.topRight, child: LanguageButton()),
                    const Spacer(),
                    Container(
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(26),
                        boxShadow: const [BoxShadow(color: Colors.black26, blurRadius: 24, offset: Offset(0, 12))],
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(26),
                        child: Image.asset('assets/icon/icon.png', width: 96, height: 96),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      l10n.appName,
                      style: text.headlineMedium?.copyWith(color: Colors.white, fontWeight: FontWeight.w800),
                    ),
                    Text(
                      l10n.tagline,
                      textAlign: TextAlign.center,
                      style: text.bodyLarge?.copyWith(color: Colors.white.withValues(alpha: 0.85)),
                    ),
                    const Spacer(),
                  ],
                ),
              ),
            ),
          ),
          // Form sheet
          Expanded(
            flex: 6,
            child: Container(
              width: double.infinity,
              decoration: const BoxDecoration(
                color: Brand.background,
                borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
              ),
              child: SafeArea(
                top: false,
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(24, 32, 24, 24),
                  children: [
                    Text(codeStep ? l10n.otpTitle : l10n.phoneTitle, style: text.titleLarge),
                    const SizedBox(height: 6),
                    Text(
                      codeStep ? l10n.otpHelp : l10n.phoneHelp,
                      style: text.bodyMedium?.copyWith(color: Brand.muted),
                    ),
                    const SizedBox(height: 20),
                    if (!codeStep)
                      TextField(
                        controller: _phone,
                        keyboardType: TextInputType.phone,
                        style: text.titleMedium?.copyWith(letterSpacing: 1),
                        inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(10)],
                        decoration: InputDecoration(
                          hintText: l10n.phoneHint,
                          prefixIcon: Padding(
                            padding: const EdgeInsets.only(left: 16, right: 8),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Text('🇳🇵', style: TextStyle(fontSize: 20)),
                                const SizedBox(width: 6),
                                Text('+977', style: text.titleMedium),
                              ],
                            ),
                          ),
                        ),
                      )
                    else
                      TextField(
                        controller: _code,
                        keyboardType: TextInputType.number,
                        autofocus: true,
                        textAlign: TextAlign.center,
                        style: text.headlineSmall?.copyWith(letterSpacing: 12),
                        inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(6)],
                        decoration: const InputDecoration(hintText: '••••••'),
                      ),
                    const SizedBox(height: 20),
                    FilledButton(
                      onPressed: _busy ? null : (codeStep ? _verify : _sendCode),
                      child: _busy
                          ? const SizedBox.square(
                              dimension: 22,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                            )
                          : Text(codeStep ? l10n.verify : l10n.sendCode),
                    ),
                    if (codeStep)
                      TextButton(
                        onPressed: _busy ? null : () => setState(() => _verificationId = null),
                        child: Text(l10n.changeNumber),
                      ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
