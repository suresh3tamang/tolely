import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:tolely/core/l10n/l10n.dart';
import 'package:tolely/core/l10n/locale_controller.dart';
import 'package:tolely/core/widgets/feedback.dart';
import 'package:tolely/core/widgets/language_button.dart';
import 'package:tolely/features/catalog/data/catalog_repository.dart';
import 'package:tolely/features/catalog/domain/service.dart';
import 'package:tolely/features/catalog/presentation/service_style.dart';
import 'package:tolely/features/profile/data/profile_repository.dart';
import 'package:tolely/features/profile/domain/supplier_account.dart';
import 'package:tolely/features/supplier/data/supplier_repository.dart';

/// First screen after login: choose customer or supplier and fill in the profile.
/// Also used by suppliers to edit their details (pass [supplier]).
class ProfileSetupScreen extends StatefulWidget {
  const ProfileSetupScreen({super.key, required this.onDone, this.supplier});

  final VoidCallback onDone;

  /// When set, edits this existing supplier account instead of starting fresh.
  final SupplierAccount? supplier;

  @override
  State<ProfileSetupScreen> createState() => _ProfileSetupScreenState();
}

class _ProfileSetupScreenState extends State<ProfileSetupScreen> {
  /// Services that need a vehicle number and water source.
  static const _tankerKey = 'tanker';

  late bool? _isSupplier = widget.supplier == null ? null : true;
  final _form = GlobalKey<FormState>();
  late final _name = TextEditingController(text: widget.supplier?.name);
  late final _address = TextEditingController(text: widget.supplier?.area);
  final _landmark = TextEditingController();
  late final _vehicleNo = TextEditingController(text: widget.supplier?.vehicleNo);
  late final _waterSource = TextEditingController(text: widget.supplier?.waterSource);
  late final _services = <String>{...?widget.supplier?.services};
  late final Future<List<Service>> _allServices = context.read<CatalogRepository>().services();
  bool _busy = false;

  @override
  void dispose() {
    _name.dispose();
    _address.dispose();
    _landmark.dispose();
    _vehicleNo.dispose();
    _waterSource.dispose();
    super.dispose();
  }

  String? _required(String? value) => (value == null || value.trim().isEmpty) ? context.l10n.required : null;

  Future<void> _save() async {
    if (!_form.currentState!.validate()) return;
    setState(() => _busy = true);
    try {
      if (_isSupplier!) {
        await context.read<SupplierRepository>().register(
          name: _name.text.trim(),
          area: _address.text.trim(),
          services: _services.toList(),
          language: context.read<LocaleController>().code,
          vehicleNo: _vehicleNo.text.trim(),
          waterSource: _waterSource.text.trim(),
        );
      } else {
        await context.read<ProfileRepository>().saveCustomerProfile(
          name: _name.text.trim(),
          address: _address.text.trim(),
          landmark: _landmark.text.trim(),
          language: context.read<LocaleController>().code,
        );
      }
      widget.onDone();
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(context.l10n.appName), actions: appBarActions()),
      body: SafeArea(child: _isSupplier == null ? _chooseRole() : _profileForm()),
    );
  }

  Widget _chooseRole() {
    final l10n = context.l10n;
    return ListView(
      padding: const EdgeInsets.all(24),
      children: [
        Text(l10n.welcome, style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 24),
        _RoleCard(icon: Icons.home, label: l10n.iNeedService, onTap: () => setState(() => _isSupplier = false)),
        const SizedBox(height: 12),
        _RoleCard(
          icon: Icons.local_shipping,
          label: l10n.iProvideService,
          onTap: () => setState(() => _isSupplier = true),
        ),
      ],
    );
  }

  Widget _profileForm() {
    final l10n = context.l10n;
    final supplier = _isSupplier!;
    return Form(
      key: _form,
      child: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          TextFormField(
            controller: _name,
            decoration: InputDecoration(labelText: l10n.name),
            validator: _required,
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _address,
            decoration: InputDecoration(labelText: supplier ? l10n.workArea : l10n.address),
            validator: _required,
          ),
          const SizedBox(height: 16),
          if (!supplier)
            TextFormField(
              controller: _landmark,
              decoration: InputDecoration(labelText: l10n.landmark),
            )
          else ...[
            Text(l10n.servicesYouOffer, style: Theme.of(context).textTheme.titleMedium),
            FutureBuilder<List<Service>>(
              future: _allServices,
              builder: (context, snapshot) => Column(
                children: [
                  for (final s in snapshot.data ?? const <Service>[])
                    CheckboxListTile(
                      value: _services.contains(s.key),
                      title: Text(context.text(s.name)),
                      secondary: ServiceAvatar(s.icon, size: 36),
                      onChanged: (on) => setState(() => on! ? _services.add(s.key) : _services.remove(s.key)),
                    ),
                ],
              ),
            ),
            if (_services.contains(_tankerKey)) ...[
              TextFormField(
                controller: _vehicleNo,
                decoration: InputDecoration(labelText: l10n.vehicleNo),
                validator: _required,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _waterSource,
                decoration: InputDecoration(labelText: l10n.waterSource),
                validator: _required,
              ),
            ],
          ],
          const SizedBox(height: 24),
          FilledButton(onPressed: _busy || (supplier && _services.isEmpty) ? null : _save, child: Text(l10n.save)),
        ],
      ),
    );
  }
}

class _RoleCard extends StatelessWidget {
  const _RoleCard({required this.icon, required this.label, required this.onTap});

  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Card(
    child: ListTile(
      contentPadding: const EdgeInsets.all(20),
      leading: Icon(icon, size: 36),
      title: Text(label, style: Theme.of(context).textTheme.titleMedium),
      trailing: const Icon(Icons.chevron_right),
      onTap: onTap,
    ),
  );
}
