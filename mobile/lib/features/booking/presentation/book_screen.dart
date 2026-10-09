import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';
import 'package:tolely/core/l10n/l10n.dart';
import 'package:tolely/core/services/location_service.dart';
import 'package:tolely/core/utils/format.dart';
import 'package:tolely/core/utils/schedule.dart';
import 'package:tolely/core/widgets/feedback.dart';
import 'package:tolely/features/booking/data/booking_repository.dart';
import 'package:tolely/features/booking/domain/booking.dart';
import 'package:tolely/features/booking/presentation/booking_labels.dart';
import 'package:tolely/features/catalog/domain/service.dart';
import 'package:tolely/features/map/presentation/booking_map.dart';
import 'package:tolely/features/map/presentation/location_picker_screen.dart';
import 'package:tolely/features/profile/domain/user_profile.dart';
import 'package:tolely/features/voice/domain/voice_draft.dart';

/// Booking form: option, time, address, payment. The price shown here is the
/// catalog price from the server, which also re-checks it when booking.
/// Closes with `true` after a successful booking.
class BookScreen extends StatefulWidget {
  const BookScreen({super.key, required this.service, required this.profile, this.optionId, this.location, this.draft});

  final Service service;
  final UserProfile profile;

  /// Pre-selected option and map pin, used by "Book again".
  final String? optionId;
  final LatLng? location;

  /// Filled in from what the customer said ("book by voice"); they check it and confirm here.
  final VoiceDraft? draft;

  @override
  State<BookScreen> createState() => _BookScreenState();
}

class _BookScreenState extends State<BookScreen> {
  late ServiceOption _option = widget.service.options.firstWhere(
    (o) => o.id == (widget.draft?.optionId ?? widget.optionId),
    orElse: () => widget.service.options.first,
  );
  late final _address = TextEditingController(text: widget.profile.address);
  late final _landmark = TextEditingController(text: widget.profile.landmark);
  late final _note = TextEditingController(text: widget.draft?.note ?? '');
  late LatLng? _location;
  PaymentMethod _payment = PaymentMethod.cash;
  bool _busy = false;
  // The day and time window ("12 PM – 3 PM"). Today if anything is left of it, otherwise tomorrow.
  late DateTime _day = widget.draft?.date ?? _firstDay();
  late TimeSlot? _slot = _draftSlot();
  late bool _otherDay = widget.draft?.date != null && widget.draft!.date!.difference(dayOf(DateTime.now())).inDays > 1;
  late final _contactName = TextEditingController(text: widget.draft?.contactName ?? widget.profile.name);
  late final _contactPhone = TextEditingController(text: widget.draft?.contactPhone ?? _localDigits(widget.profile.phone));

  @override
  void initState() {
    super.initState();
    // Starts from the pin of this customer's last booking.
    _location = widget.location ?? context.read<BookingRepository>().lastPickedLocation;
    // Said "mero ghar ma" / "yahi" when booking by voice: pin where they are now.
    if (widget.draft?.atCurrentLocation ?? false) _pinCurrentLocation();
  }

  Future<void> _pinCurrentLocation() async {
    final here = await context.read<LocationService>().currentPosition();
    if (here != null && mounted) setState(() => _location = here);
  }

  @override
  void dispose() {
    _address.dispose();
    _landmark.dispose();
    _note.dispose();
    _contactName.dispose();
    _contactPhone.dispose();
    super.dispose();
  }

  /// The window the customer said, if it can still be booked on that day.
  TimeSlot? _draftSlot() {
    final slot = widget.draft?.slot;
    return slot != null && availableSlots(_day, DateTime.now()).contains(slot) ? slot : null;
  }

  static DateTime _firstDay() {
    final now = DateTime.now();
    return availableSlots(now, now).isNotEmpty ? dayOf(now) : dayOf(now).add(const Duration(days: 1));
  }

  /// `+9779800000001` -> `9800000001`.
  static String _localDigits(String? phone) => (phone ?? '').replaceFirst('+977', '').replaceAll(RegExp(r'\D'), '');

  bool get _phoneOk => _contactPhone.text.length >= 8 && _contactPhone.text.length <= 10;

  String _dayName(DateTime d) {
    final today = dayOf(DateTime.now());
    if (d == today) return context.l10n.today;
    if (d == today.add(const Duration(days: 1))) return context.l10n.tomorrow;
    return formatDayTime(d).split(',').first;
  }

  Future<void> _pickOtherDay() async {
    final now = DateTime.now();
    final date = await showDatePicker(
      context: context,
      initialDate: _day,
      firstDate: now,
      lastDate: now.add(const Duration(days: bookAheadDays)),
    );
    if (date == null || !mounted) return;
    setState(() {
      _otherDay = true;
      _day = dayOf(date);
      _slot = null;
    });
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
    final window = _slot == null ? null : windowFor(_day, _slot!, DateTime.now()); // re-checked: the form may have been open a while
    if (window == null) return showMessage(context, l10n.timeExpired);
    setState(() => _busy = true);
    try {
      await context.read<BookingRepository>().create(
        NewBooking(
          serviceKey: widget.service.key,
          optionId: _option.id,
          address: _address.text.trim(),
          landmark: _landmark.text.trim(),
          scheduledFor: window.start,
          scheduledEnd: window.end,
          contactName: _contactName.text.trim(),
          contactPhone: _contactPhone.text,
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
          if (widget.draft != null) ...[
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: Colors.blue.shade50, borderRadius: BorderRadius.circular(12)),
              child: Row(
                children: [
                  const Icon(Icons.mic_rounded, color: Colors.blue),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(l10n.voiceReady, style: text.labelLarge),
                        if (widget.draft!.reply.isNotEmpty) Text(widget.draft!.reply, style: text.bodyMedium),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
          ],
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
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            children: [
              for (final d in [dayOf(DateTime.now()), dayOf(DateTime.now()).add(const Duration(days: 1))])
                ChoiceChip(
                  label: Text(_dayName(d)),
                  selected: !_otherDay && _day == d,
                  onSelected: (_) => setState(() {
                    _otherDay = false;
                    _day = d;
                    _slot = null;
                  }),
                ),
              ChoiceChip(
                label: Text(_otherDay ? _dayName(_day) : l10n.otherDate),
                selected: _otherDay,
                onSelected: (_) => _pickOtherDay(),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            children: [
              for (final s in availableSlots(_day, DateTime.now()))
                ChoiceChip(
                  label: Text(s.isAsap ? l10n.asap : slotText(s)),
                  selected: _slot == s,
                  onSelected: (_) => setState(() => _slot = s),
                ),
            ],
          ),
          if (availableSlots(_day, DateTime.now()).isEmpty)
            Padding(padding: const EdgeInsets.only(top: 4), child: Text(l10n.noSlotsToday, style: text.bodySmall)),
          const SizedBox(height: 16),
          Text(l10n.contactTitle, style: text.titleMedium),
          const SizedBox(height: 8),
          TextField(
            controller: _contactName,
            textCapitalization: TextCapitalization.words,
            decoration: InputDecoration(labelText: l10n.contactName),
            onChanged: (_) => setState(() {}),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _contactPhone,
            keyboardType: TextInputType.phone,
            maxLength: 10,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
            decoration: InputDecoration(
              labelText: l10n.contactPhone,
              prefixText: '+977 ',
              helperText: l10n.contactHint,
              helperMaxLines: 2,
              errorText: _contactPhone.text.isNotEmpty && !_phoneOk ? l10n.contactInvalid : null,
              counterText: '',
            ),
            onChanged: (_) => setState(() {}),
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
            onPressed: _busy || _slot == null || _contactName.text.trim().length < 2 || !_phoneOk ? null : _book,
            child: Text('${l10n.confirmBooking} · ${rupees(_option.price)}'),
          ),
        ),
      ),
    );
  }
}
