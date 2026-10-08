import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

import '../i18n.dart';
import '../location.dart';

/// Full-screen map: move the map so the pin sits on your house, then confirm.
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

  Future<void> _goToMe() async {
    setState(() => _locating = true);
    final me = await currentLatLng();
    if (!mounted) return;
    setState(() => _locating = false);
    if (me == null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(tr('locationOff'))));
      return;
    }
    _center = me;
    _map.move(me, 17);
  }

  @override
  Widget build(BuildContext context) {
    final color = Theme.of(context).colorScheme.primary;
    return Scaffold(
      appBar: AppBar(title: Text(tr('pinLocation'))),
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
                child: Text(tr('pinHelp'), textAlign: TextAlign.center),
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
            style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(52)),
            icon: const Icon(Icons.check),
            label: Text(tr('confirmLocation')),
            onPressed: () => Navigator.pop(context, _center),
          ),
        ),
      ),
    );
  }
}

/// Small non-interactive map showing the booking pin and, while on the way,
/// the supplier's live position.
class BookingMap extends StatelessWidget {
  const BookingMap({super.key, required this.home, this.supplier, this.height = 200});
  final LatLng home;
  final LatLng? supplier;
  final double height;

  @override
  Widget build(BuildContext context) {
    final color = Theme.of(context).colorScheme.primary;
    final points = [home, ?supplier];
    return ClipRRect(
      borderRadius: BorderRadius.circular(12),
      child: SizedBox(
        height: height,
        child: FlutterMap(
          options: MapOptions(
            initialCameraFit: points.length > 1
                ? CameraFit.coordinates(coordinates: points, padding: const EdgeInsets.all(48), maxZoom: 17)
                : null,
            initialCenter: home,
            initialZoom: 16,
            interactionOptions: const InteractionOptions(flags: InteractiveFlag.pinchZoom | InteractiveFlag.drag),
          ),
          children: [
            osmTiles(),
            MarkerLayer(
              markers: [
                Marker(
                  point: home,
                  width: 40,
                  height: 40,
                  alignment: Alignment.topCenter,
                  child: Icon(Icons.location_on, size: 40, color: color),
                ),
                if (supplier != null)
                  Marker(
                    point: supplier!,
                    width: 40,
                    height: 40,
                    child: Container(
                      decoration: BoxDecoration(
                        color: Colors.amber.shade600,
                        shape: BoxShape.circle,
                        border: Border.all(color: Colors.white, width: 3),
                        boxShadow: const [BoxShadow(blurRadius: 6, color: Colors.black26)],
                      ),
                      child: const Icon(Icons.local_shipping, size: 20, color: Colors.white),
                    ),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
