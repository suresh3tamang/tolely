import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';
import 'package:tolely/core/l10n/l10n.dart';
import 'package:tolely/core/services/location_service.dart';
import 'package:tolely/core/utils/geo.dart';
import 'package:tolely/core/widgets/map_tiles.dart';

/// Full-screen map: move the map so the pin sits on your house, then confirm.
/// Returns the chosen [LatLng] with `Navigator.pop`.
class LocationPickerScreen extends StatefulWidget {
  const LocationPickerScreen({super.key, this.initial});

  final LatLng? initial;

  @override
  State<LocationPickerScreen> createState() => _LocationPickerScreenState();
}

class _LocationPickerScreenState extends State<LocationPickerScreen> {
  final _map = MapController();
  late LatLng _center = widget.initial ?? kathmandu;
  bool _locating = false;

  @override
  void initState() {
    super.initState();
    if (widget.initial == null) _goToMe();
  }

  @override
  void dispose() {
    _map.dispose();
    super.dispose();
  }

  Future<void> _goToMe() async {
    setState(() => _locating = true);
    final me = await context.read<LocationService>().currentPosition();
    if (!mounted) return;
    setState(() => _locating = false);
    if (me == null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(context.l10n.locationOff)));
      return;
    }
    _center = me;
    _map.move(me, 17);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final color = Theme.of(context).colorScheme.primary;
    return Scaffold(
      appBar: AppBar(title: Text(l10n.pinLocation)),
      body: Stack(
        children: [
          FlutterMap(
            mapController: _map,
            options: MapOptions(
              initialCenter: _center,
              initialZoom: widget.initial == null ? 13 : 17,
              onPositionChanged: (camera, _) => _center = camera.center,
            ),
            children: [osmTiles()],
          ),
          // Fixed pin in the middle; the map moves underneath it.
          IgnorePointer(
            child: Center(
              child: Padding(
                padding: const EdgeInsets.only(bottom: 40),
                child: Icon(Icons.location_on, size: 48, color: color),
              ),
            ),
          ),
          Positioned(
            left: 16,
            right: 16,
            top: 16,
            child: Card(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Text(l10n.pinHelp, textAlign: TextAlign.center),
              ),
            ),
          ),
          Positioned(
            right: 16,
            bottom: 100,
            child: FloatingActionButton.small(
              heroTag: 'me',
              onPressed: _locating ? null : _goToMe,
              child: _locating
                  ? const SizedBox.square(dimension: 18, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Icon(Icons.my_location),
            ),
          ),
          const Positioned(
            left: 8,
            bottom: 84,
            child: Text('© OpenStreetMap', style: TextStyle(fontSize: 10, color: Colors.black54)),
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: FilledButton.icon(
            icon: const Icon(Icons.check),
            label: Text(l10n.confirmLocation),
            onPressed: () => Navigator.pop(context, _center),
          ),
        ),
      ),
    );
  }
}
