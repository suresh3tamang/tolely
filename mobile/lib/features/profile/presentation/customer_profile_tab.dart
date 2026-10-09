import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:tolely/core/l10n/l10n.dart';
import 'package:tolely/core/l10n/locale_controller.dart';
import 'package:tolely/core/widgets/feedback.dart';
import 'package:tolely/features/auth/data/auth_repository.dart';
import 'package:tolely/features/auth/presentation/logout_button.dart';
import 'package:tolely/features/profile/data/profile_repository.dart';
import 'package:tolely/features/profile/domain/user_profile.dart';
import 'package:tolely/features/profile/presentation/delete_account_button.dart';
import 'package:tolely/features/profile/presentation/language_picker.dart';

/// Customer profile: edit name and address, choose language, log out, delete account.
class CustomerProfileTab extends StatefulWidget {
  const CustomerProfileTab({super.key, required this.profile, required this.onSaved});

  final UserProfile profile;

  /// Called with the saved profile so the rest of the app shows the new details.
  final ValueChanged<UserProfile> onSaved;

  @override
  State<CustomerProfileTab> createState() => _CustomerProfileTabState();
}

class _CustomerProfileTabState extends State<CustomerProfileTab> {
  late final _name = TextEditingController(text: widget.profile.name);
  late final _address = TextEditingController(text: widget.profile.address);
  late final _landmark = TextEditingController(text: widget.profile.landmark);
  bool _busy = false;

  @override
  void dispose() {
    _name.dispose();
    _address.dispose();
    _landmark.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final l10n = context.l10n;
    final name = _name.text.trim(), address = _address.text.trim(), landmark = _landmark.text.trim();
    if (name.isEmpty || address.isEmpty) return showMessage(context, l10n.required);
    setState(() => _busy = true);
    try {
      final language = context.read<LocaleController>().code;
      await context.read<ProfileRepository>().saveCustomerProfile(
        name: name,
        address: address,
        landmark: landmark,
        language: language,
      );
      widget.onSaved(
        UserProfile(
          uid: widget.profile.uid,
          role: widget.profile.role,
          name: name,
          address: address,
          landmark: landmark,
          language: language,
          phone: widget.profile.phone,
        ),
      );
      if (mounted) showMessage(context, l10n.saved);
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text(context.read<AuthRepository>().phoneNumber ?? '', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 16),
        TextField(
          controller: _name,
          decoration: InputDecoration(labelText: l10n.name),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _address,
          decoration: InputDecoration(labelText: l10n.address),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _landmark,
          decoration: InputDecoration(labelText: l10n.landmark),
        ),
        const SizedBox(height: 16),
        const LanguagePicker(),
        const SizedBox(height: 16),
        FilledButton(onPressed: _busy ? null : _save, child: Text(l10n.save)),
        const SizedBox(height: 24),
        const LogoutButton(),
        const SizedBox(height: 8),
        const DeleteAccountButton(),
      ],
    );
  }
}
