import 'package:flutter/material.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';
import 'package:tolely/core/l10n/l10n.dart';
import 'package:tolely/core/utils/format.dart';
import 'package:tolely/core/widgets/feedback.dart';
import 'package:tolely/features/booking/data/booking_repository.dart';
import 'package:tolely/features/booking/domain/booking.dart';
import 'package:tolely/features/booking/presentation/booking_labels.dart';
import 'package:tolely/features/catalog/domain/service.dart';
import 'package:tolely/features/map/presentation/booking_map.dart';
import 'package:tolely/features/map/presentation/location_picker_screen.dart';
import 'package:tolely/features/profile/domain/user_profile.dart';

/// Booking form: option, time, address, payment. The price shown here is the
/// catalog price from the server, which also re-checks it when booking.
/// Closes with `true` after a successful booking.
class BookScreen extends StatefulWidget {
  const BookScreen({super.key, required this.service, required this.profile, this.optionId, this.location});

  final Service service;
  final UserProfile profile;

  /// Pre-selected option and map pin, used by "Book again".
  final String? optionId;
  final LatLng? location;

  @override
  State<BookScreen> createState() => _BookScreenState();
}

class _BookScreenState extends State<BookScreen> {
  late ServiceOption _option = widget.service.options.firstWhere(
    (o) => o.id == widget.optionId,
    orElse: () => widget.service.options.first,
  );
  late final _address = TextEditingController(text: widget.profile.address);
  late final _landmark = TextEditingController(text: widget.profile.landmark);
  final _note = TextEditingController();
  late LatLng? _location;
  PaymentMethod _payment = PaymentMethod.cash;
  bool _busy = false;
  DateTime _when = _nextSlot();

  @override
  void initState() {
    super.initState();
    // Starts from the pin of this customer's last booking.
    _location = widget.location ?? context.read<BookingRepository>().lastPickedLocation;
  }

  @override
  void dispose() {
    _address.dispose();
    _landmark.dispose();
    _note.dispose();
    super.dispose();
  }

  // Next whole hour at least one hour from now.
  static DateTime _nextSlot() {
    final t = DateTime.now().add(const Duration(hours: 2));
    return DateTime(t.year, t.month, t.day, t.hour);
  }

  Future<void> _pickTime() async {
    final date = await showDatePicker(
      context: context,
      initialDate: _when,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 29)),
    );
    if (date == null || !mounted) return;
    final time = await showTimePicker(context: context, initialTime: TimeOfDay.fromDateTime(_when));
    if (time == null) return;
    setState(() => _when = DateTime(date.year, date.month, date.day, time.hour, time.minute));
  }

  Future<void> _pickLocation() async {
    final picked = await Navigator.push<LatLng>(
      context,
      MaterialPageRoute(builder: (_) => LocationPickerScreen(initial: _location)),
    );
    if (picked != null) setState(() => _location = picked);
  }

  Future<void> _book() async {
    final l10n = context.l10n;
    if (_address.text.trim().isEmpty) return showMessage(context, '${l10n.address}: ${l10n.required}');
    setState(() => _busy = true);
    try {
      await context.read<BookingRepository>().create(
        NewBooking(
          serviceKey: widget.service.key,
          optionId: _option.id,
          address: _address.text.trim(),
          landmark: _landmark.text.trim(),
          scheduledFor: _when,
          paymentMethod: _payment,
          note: _note.text.trim(),
          location: _location,
        ),
      );
      if (!mounted) return;
      showMessage(context, l10n.booked);
      Navigator.pop(context, true);
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final text = Theme.of(context).textTheme;
    return Scaffold(
      appBar: AppBar(title: Text(context.text(widget.service.name))),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(l10n.chooseOption, style: text.titleMedium),
          RadioGroup<String>(
            groupValue: _option.id,
            onChanged: (id) => setState(() => _option = widget.service.options.firstWhere((o) => o.id == id)),
            child: Column(
              children: [
                for (final o in widget.service.options)
                  RadioListTile<String>(
                    value: o.id,
                    title: Text(context.text(o.label)),
                    secondary: Text(rupees(o.price), style: text.titleSmall),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          Text(l10n.when, style: text.titleMedium),
          ListTile(
            leading: const Icon(Icons.schedule),
            title: Text(formatDateTime(_when)),
            trailing: const Icon(Icons.edit),
            onTap: _pickTime,
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _address,
            decoration: InputDecoration(labelText: l10n.address),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _landmark,
            decoration: InputDecoration(labelText: l10n.landmark),
          ),
          const SizedBox(height: 8),
          Card(
            margin: EdgeInsets.zero,
            clipBehavior: Clip.antiAlias,
            child: InkWell(
              onTap: _pickLocation,
              child: _location == null
                  ? ListTile(
                      leading: const Icon(Icons.add_location_alt),
                      title: Text(l10n.addMapPin),
                      trailing: const Icon(Icons.chevron_right),
                    )
                  : Column(
                      children: [
                        BookingMap(home: _location!, height: 140, interactive: false),
                        ListTile(
                          dense: true,
                          leading: const Icon(Icons.check_circle, color: Colors.green),
                          title: Text(l10n.locationPinned),
                          trailing: const Icon(Icons.edit),
                        ),
                      ],
                    ),
            ),
          ),
          const SizedBox(height: 16),
          Text(l10n.payment, style: text.titleMedium),
          const SizedBox(height: 8),
          SegmentedButton<PaymentMethod>(
            segments: [
              ButtonSegment(
                value: PaymentMethod.cash,
                label: Text(l10n.paymentLabel(PaymentMethod.cash)),
                icon: const Icon(Icons.payments),
              ),
              ButtonSegment(
                value: PaymentMethod.qr,
                label: Text(l10n.paymentLabel(PaymentMethod.qr)),
                icon: const Icon(Icons.qr_code),
              ),
            ],
            selected: {_payment},
            onSelectionChanged: (v) => setState(() => _payment = v.first),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _note,
            maxLines: 2,
            decoration: InputDecoration(labelText: l10n.note),
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: FilledButton(
            onPressed: _busy ? null : _book,
            child: Text('${l10n.confirmBooking} · ${rupees(_option.price)}'),
          ),
        ),
      ),
    );
  }
}
