import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';

/// Device location and navigation. Provided through `Provider`, so tests can
/// replace it with a fake.
class LocationService {
  const LocationService();

  /// Current position, or null if location is off or permission was refused.
  Future<LatLng?> currentPosition() async {
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

  /// Opens turn-by-turn directions in Google Maps (or the browser).
  Future<void> openDirections(LatLng to) => launchUrl(
    Uri.parse('https://www.google.com/maps/dir/?api=1&destination=${to.latitude},${to.longitude}'),
    mode: LaunchMode.externalApplication,
  );
}
