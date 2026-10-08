import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';

/// Map center used before we know where the user is.
const kathmandu = LatLng(27.7172, 85.3240);

/// OpenStreetMap tiles. For heavy production traffic, switch to a paid tile
/// provider (OSM's free servers have a fair-use policy).
TileLayer osmTiles() =>
    TileLayer(urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', userAgentPackageName: 'com.tolely.app');

/// Current position, or null if location is off or permission was refused.
Future<LatLng?> currentLatLng() async {
  try {
    if (!await Geolocator.isLocationServiceEnabled()) return null;
    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) permission = await Geolocator.requestPermission();
    if (permission == LocationPermission.denied || permission == LocationPermission.deniedForever) return null;
    final p = await Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(accuracy: LocationAccuracy.high, timeLimit: Duration(seconds: 15)),
    );
    return LatLng(p.latitude, p.longitude);
  } catch (_) {
    return null;
  }
}

LatLng? latLngFrom(Object? value) {
  if (value is! Map) return null;
  final lat = value['lat'], lng = value['lng'];
  return lat is num && lng is num ? LatLng(lat.toDouble(), lng.toDouble()) : null;
}

/// Opens turn-by-turn directions in Google Maps (or the browser).
Future<void> openDirections(LatLng to) => launchUrl(
  Uri.parse('https://www.google.com/maps/dir/?api=1&destination=${to.latitude},${to.longitude}'),
  mode: LaunchMode.externalApplication,
);
