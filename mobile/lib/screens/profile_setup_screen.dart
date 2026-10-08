import 'package:flutter/material.dart';

import '../api.dart';
import '../i18n.dart';
import '../models.dart';
import 'common.dart';

/// First screen after login: choose customer or supplier and fill the profile.
class ProfileSetupScreen extends StatefulWidget {
  const ProfileSetupScreen({super.key, required this.onDone, this.supplier});
  final VoidCallback onDone;

  /// When set, edits this existing supplier profile instead of starting fresh.
  final Map<String, dynamic>? supplier;

  @override
  State<ProfileSetupScreen> createState() => _ProfileSetupScreenState();
}

class _ProfileSetupScreenState extends State<ProfileSetupScreen> {
  late bool? _isSupplier = widget.supplier == null ? null : true;
  final _form = GlobalKey<FormState>();
  late final _name = TextEditingController(text: widget.supplier?['name']);
  late final _address = TextEditingController(text: widget.supplier?['area']);
  final _landmark = TextEditingController();
  late final _vehicleNo = TextEditingController(text: widget.supplier?['vehicleNo']);
  late final _waterSource = TextEditingController(text: widget.supplier?['waterSource']);
  late final _services = <String>{...List<String>.from(widget.supplier?['services'] ?? [])};
  late final Future<List<Service>> _allServices = Api.services();
  bool _busy = false;

  String? _required(String? v) => (v == null || v.trim().isEmpty) ? tr('required') : null;

  Future<void> _save() async {
    if (!_form.currentState!.validate()) return;
    setState(() => _busy = true);
    try {
      if (_isSupplier!) {
        await Api.registerSupplier(
          name: _name.text,
          area: _address.text,
          services: _services.toList(),
          vehicleNo: _vehicleNo.text,
          waterSource: _waterSource.text,
        );
      } else {
        await Api.saveCustomerProfile(name: _name.text, address: _address.text, landmark: _landmark.text);
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
      appBar: AppBar(title: Text(tr('appName')), actions: appBarActions()),
      body: SafeArea(child: _isSupplier == null ? _chooseRole() : _profileForm()),
    );
  }

  Widget _chooseRole() => ListView(
    padding: const EdgeInsets.all(24),
    children: [
      Text(tr('welcome'), style: Theme.of(context).textTheme.titleLarge),
      const SizedBox(height: 24),
      _RoleCard(icon: Icons.home, label: tr('iNeedService'), onTap: () => setState(() => _isSupplier = false)),
      const SizedBox(height: 12),
      _RoleCard(
        icon: Icons.local_shipping,
        label: tr('iProvideService'),
        onTap: () => setState(() => _isSupplier = true),
      ),
    ],
  );

  Widget _profileForm() => Form(
    key: _form,
    child: ListView(
      padding: const EdgeInsets.all(24),
      children: [
        TextFormField(
          controller: _name,
          decoration: InputDecoration(labelText: tr('name')),
          validator: _required,
        ),
        const SizedBox(height: 16),
        TextFormField(
          controller: _address,
          decoration: InputDecoration(labelText: tr(_isSupplier! ? 'workArea' : 'address')),
          validator: _required,
        ),
        const SizedBox(height: 16),
        if (!_isSupplier!)
          TextFormField(
            controller: _landmark,
            decoration: InputDecoration(labelText: tr('landmark')),
          )
        else ...[
          Text(tr('servicesYouOffer'), style: Theme.of(context).textTheme.titleMedium),
          FutureBuilder(
            future: _allServices,
            builder: (context, snap) => Column(
              children: [
                for (final s in snap.data ?? <Service>[])
                  CheckboxListTile(
                    value: _services.contains(s.key),
                    title: Text(s.name),
                    secondary: Icon(serviceIcon(s.icon)),
                    onChanged: (on) => setState(() => on! ? _services.add(s.key) : _services.remove(s.key)),
                  ),
              ],
            ),
          ),
          if (_services.contains('tanker')) ...[
            TextFormField(
              controller: _vehicleNo,
              decoration: InputDecoration(labelText: tr('vehicleNo')),
              validator: _required,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _waterSource,
              decoration: InputDecoration(labelText: tr('waterSource')),
              validator: _required,
            ),
          ],
        ],
        const SizedBox(height: 24),
        FilledButton(
          onPressed: _busy || (_isSupplier! && _services.isEmpty) ? null : _save,
          style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(52)),
          child: Text(tr('save')),
        ),
      ],
    ),
  );
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
