import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:tolely/core/widgets/map_tiles.dart';

/// Small map showing the booking pin and, while the supplier is on the way,
/// their live position.
class BookingMap extends StatelessWidget {
  const BookingMap({super.key, required this.home, this.supplier, this.height = 200, this.interactive = true});

  final LatLng home;
  final LatLng? supplier;
  final double height;

  /// Set to false when the map is only a preview inside a tappable card.
  final bool interactive;

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
            interactionOptions: InteractionOptions(
              flags: interactive ? InteractiveFlag.pinchZoom | InteractiveFlag.drag : InteractiveFlag.none,
            ),
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
