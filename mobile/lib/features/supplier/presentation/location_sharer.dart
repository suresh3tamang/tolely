import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:tolely/core/l10n/l10n.dart';
import 'package:tolely/core/services/location_service.dart';
import 'package:tolely/features/booking/data/booking_repository.dart';

/// While the supplier has a job "on the way", sends their position every 20
/// seconds so the customer can follow them on the map (while the app is open),
/// and shows a green bar so the supplier knows it is being shared.
class LocationSharer extends StatefulWidget {
  const LocationSharer({super.key, required this.uid});

  final String uid;

  @override
  State<LocationSharer> createState() => _LocationSharerState();
}

class _LocationSharerState extends State<LocationSharer> {
  late final BookingRepository _bookings;
  late final LocationService _location;
  StreamSubscription<List<String>>? _subscription;
  Timer? _timer;
  List<String> _jobIds = const [];

  @override
  void initState() {
    super.initState();
    _bookings = context.read<BookingRepository>();
    _location = context.read<LocationService>();
    _subscription = _bookings.watchOnTheWayJobIds(widget.uid).listen(_onJobs);
  }

  void _onJobs(List<String> ids) {
    final wasSharing = _jobIds.isNotEmpty;
    setState(() => _jobIds = ids);
    if (ids.isNotEmpty && !wasSharing) {
      _send();
      _timer = Timer.periodic(const Duration(seconds: 20), (_) => _send());
    } else if (ids.isEmpty) {
      _timer?.cancel();
      _timer = null;
    }
  }

  Future<void> _send() async {
    final at = await _location.currentPosition();
    if (at == null) return;
    for (final id in _jobIds) {
      await _bookings.shareLocation(id, at).catchError((_) {});
    }
  }

  @override
  void dispose() {
    _subscription?.cancel();
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_jobIds.isEmpty) return const SizedBox.shrink();
    return Container(
      width: double.infinity,
      color: Colors.green.shade50,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      child: Row(
        children: [
          Icon(Icons.my_location, size: 18, color: Colors.green.shade700),
          const SizedBox(width: 8),
          Expanded(
            child: Text(context.l10n.sharingLocation, style: TextStyle(color: Colors.green.shade900)),
          ),
        ],
      ),
    );
  }
}
