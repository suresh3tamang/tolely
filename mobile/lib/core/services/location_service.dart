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

  /// Starts driving navigation to [to] in Google Maps. On Android this opens turn-by-turn straight away;
  /// otherwise (or without the Google Maps app) the directions page opens, ready to start.
  Future<void> openDirections(LatLng to) async {
    final at = '${to.latitude},${to.longitude}';
    try {
      if (await launchUrl(Uri.parse('google.navigation:q=$at&mode=d'), mode: LaunchMode.externalApplication)) return;
    } catch (_) {
      // No Google Maps app (or not Android): use the web link below.
    }
    await launchUrl(
      Uri.parse('https://www.google.com/maps/dir/?api=1&destination=$at&travelmode=driving&dir_action=navigate'),
      mode: LaunchMode.externalApplication,
    );
  }
}
