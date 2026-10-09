import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:tolely/core/l10n/l10n.dart';
import 'package:tolely/core/services/push_service.dart';
import 'package:tolely/core/widgets/feedback.dart';
import 'package:tolely/features/profile/domain/supplier_account.dart';
import 'package:tolely/features/supplier/data/supplier_repository.dart';

/// Online / offline switch in the app bar. Offline suppliers get no new-job alerts.
class OnlineSwitch extends StatefulWidget {
  const OnlineSwitch({super.key, required this.supplier, required this.onChanged});

  final SupplierAccount supplier;

  /// Called after the server accepted the change, so the app can reload.
  final VoidCallback onChanged;

  @override
  State<OnlineSwitch> createState() => _OnlineSwitchState();
}

class _OnlineSwitchState extends State<OnlineSwitch> {
  late bool _online = widget.supplier.online;
  bool _busy = false;
  Timer? _askTimer;

  @override
  void initState() {
    super.initState();
    // Online suppliers need job alerts: ask once the screen has settled.
    // (No prompt is shown if they already answered.)
    if (_online) {
      final push = context.read<PushService>();
      final services = widget.supplier.services;
      _askTimer = Timer(const Duration(seconds: 1), () => push.start(supplierServices: services, ask: true));
    }
  }

  @override
  void dispose() {
    _askTimer?.cancel();
    super.dispose();
  }

  Future<void> _set(bool online) async {
    setState(() {
      _online = online;
      _busy = true;
    });
    final suppliers = context.read<SupplierRepository>();
    final push = context.read<PushService>();
    try {
      await suppliers.setOnline(online);
      await push.start(supplierServices: online ? widget.supplier.services : const [], ask: online);
      widget.onChanged();
    } catch (e) {
      if (mounted) {
        setState(() => _online = !online);
        showError(context, e);
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(_online ? l10n.online : l10n.offline, style: Theme.of(context).textTheme.labelMedium),
        Switch(value: _online, activeThumbColor: Colors.green, onChanged: _busy ? null : _set),
      ],
    );
  }
}
