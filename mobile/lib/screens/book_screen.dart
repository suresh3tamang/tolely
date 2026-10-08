import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:latlong2/latlong.dart';

import '../api.dart';
import '../i18n.dart';
import '../models.dart';
import 'common.dart';
import 'location_picker_screen.dart';

/// Booking form: option, time, address, payment. The price shown here is the
/// catalog price from the server, which also re-checks it when booking.
class BookScreen extends StatefulWidget {
  const BookScreen({super.key, required this.service, required this.profile, this.optionId, this.location});
  final Service service;

  /// Pre-selected option and map pin, used by "Book again".
  final String? optionId;
  final LatLng? location;
  final Map<String, dynamic> profile;

  @override
  State<BookScreen> createState() => _BookScreenState();
}

class _BookScreenState extends State<BookScreen> {
  late ServiceOption _option = widget.service.options.firstWhere(
    (o) => o.id == widget.optionId,
    orElse: () => widget.service.options.first,
  );
  // Defaults to the pin from this customer's last booking.
  late LatLng? _location = widget.location ?? widget.profile['lastLocation'] as LatLng?;
  late final _address = TextEditingController(text: widget.profile['address'] ?? '');
  late final _landmark = TextEditingController(text: widget.profile['landmark'] ?? '');
  final _note = TextEditingController();
  String _payment = 'cash';
  bool _busy = false;
  DateTime _when = _nextSlot();

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
    if (_address.text.trim().isEmpty) return showError(context, '${tr('address')}: ${tr('required')}');
    setState(() => _busy = true);
    try {
      await Api.createBooking(
        serviceKey: widget.service.key,
        optionId: _option.id,
        address: _address.text,
        landmark: _landmark.text,
        scheduledFor: _when,
        paymentMethod: _payment,
        note: _note.text,
        location: _location,
      );
      widget.profile['lastLocation'] = _location;
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(tr('booked'))));
      Navigator.pop(context, true);
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    return Scaffold(
      appBar: AppBar(title: Text(widget.service.name)),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(tr('chooseOption'), style: text.titleMedium),
          RadioGroup<String>(
            groupValue: _option.id,
            onChanged: (id) => setState(() => _option = widget.service.options.firstWhere((o) => o.id == id)),
            child: Column(
              children: [
                for (final o in widget.service.options)
                  RadioListTile<String>(
                    value: o.id,
                    title: Text(o.label),
                    secondary: Text(rupees(o.price), style: text.titleSmall),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          Text(tr('when'), style: text.titleMedium),
          ListTile(
            leading: const Icon(Icons.schedule),
            title: Text(DateFormat('EEE, d MMM · h:mm a').format(_when)),
            trailing: const Icon(Icons.edit),
            onTap: _pickTime,
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _address,
            decoration: InputDecoration(labelText: tr('address')),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _landmark,
            decoration: InputDecoration(labelText: tr('landmark')),
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
                      title: Text(tr('addMapPin')),
                      trailing: const Icon(Icons.chevron_right),
                    )
                  : Column(
                      children: [
                        IgnorePointer(child: BookingMap(home: _location!, height: 140)),
                        ListTile(
                          dense: true,
                          leading: const Icon(Icons.check_circle, color: Colors.green),
                          title: Text(tr('locationPinned')),
                          trailing: const Icon(Icons.edit),
                        ),
                      ],
                    ),
            ),
          ),
          const SizedBox(height: 16),
          Text(tr('payment'), style: text.titleMedium),
          const SizedBox(height: 8),
          SegmentedButton<String>(
            segments: [
              ButtonSegment(value: 'cash', label: Text(tr('cash')), icon: const Icon(Icons.payments)),
              ButtonSegment(value: 'qr', label: Text(tr('qr')), icon: const Icon(Icons.qr_code)),
            ],
            selected: {_payment},
            onSelectionChanged: (v) => setState(() => _payment = v.first),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _note,
            maxLines: 2,
            decoration: InputDecoration(labelText: tr('note')),
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: FilledButton(
            onPressed: _busy ? null : _book,
            style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(54)),
            child: Text('${tr('confirmBooking')} · ${rupees(_option.price)}'),
          ),
        ),
      ),
    );
  }
}
