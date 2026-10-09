import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:tolely/core/l10n/l10n.dart';
import 'package:tolely/core/services/push_service.dart';
import 'package:tolely/core/theme/brand.dart';
import 'package:tolely/core/widgets/slide_action.dart';
import 'package:tolely/core/widgets/feedback.dart';
import 'package:tolely/features/profile/domain/supplier_account.dart';
import 'package:tolely/features/supplier/data/supplier_repository.dart';

/// The Online / Offline card at the top of the jobs tab: slide to go online or offline.
/// Offline suppliers get no new-job alerts and see no open jobs.
class OnlineSwitch extends StatefulWidget {
  const OnlineSwitch({super.key, required this.supplier, required this.onChanged});

  final SupplierAccount supplier;

  /// Called with the new state once the server accepted it, so the screen can update straight away.
  final ValueChanged<bool> onChanged;

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
  void didUpdateWidget(OnlineSwitch old) {
    super.didUpdateWidget(old);
    // The account was reloaded: follow what the server says (unless a change is on its way).
    if (!_busy && old.supplier.online != widget.supplier.online) _online = widget.supplier.online;
  }

  @override
  void dispose() {
    _askTimer?.cancel();
    super.dispose();
  }

  Future<void> _set(bool online) async {
    setState(() => _busy = true);
    final suppliers = context.read<SupplierRepository>();
    final push = context.read<PushService>();
    try {
      await suppliers.setOnline(online);
    } catch (e) {
      // The server didn't change: stay as we were.
      if (mounted) {
        setState(() => _busy = false);
        showError(context, e);
      }
      return;
    }
    if (!mounted) return;
    setState(() {
      _online = online;
      _busy = false;
    });
    widget.onChanged(online);
    // Job alerts follow. A problem here (e.g. notifications not allowed) must not undo going online.
    try {
      await push.start(supplierServices: online ? widget.supplier.services : const [], ask: online);
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final text = Theme.of(context).textTheme;
    const green = Color(0xFF047857);
    final color = _online ? green : Brand.muted;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: _online ? const Color(0xFFECFDF5) : Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: _online ? const Color(0xFFA7F3D0) : Brand.line),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                width: 12,
                height: 12,
                decoration: BoxDecoration(color: _online ? const Color(0xFF10B981) : Colors.grey.shade400, shape: BoxShape.circle),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _online ? l10n.onlineTitle : l10n.offlineTitle,
                      style: text.titleMedium?.copyWith(color: color, fontWeight: FontWeight.w700),
                    ),
                    Text(
                      _online ? l10n.onlineSubtitle : l10n.offlineSubtitle,
                      style: text.bodySmall?.copyWith(color: Brand.muted),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          SlideAction(
            busy: _busy,
            reversed: _online,
            color: _online ? const Color(0xFFB91C1C) : const Color(0xFF059669),
            icon: Icons.power_settings_new,
            label: _online ? l10n.slideOffline : l10n.slideOnline,
            onSlide: () => _set(!_online),
          ),
        ],
      ),
    );
  }
}
