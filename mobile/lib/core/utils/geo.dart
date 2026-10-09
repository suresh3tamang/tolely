import 'package:latlong2/latlong.dart';

/// Map centre used before we know where the user is.
const kathmandu = LatLng(27.7172, 85.3240);

/// Reads `{lat, lng}` from JSON, or null if it isn't a valid point.
LatLng? latLngFromJson(Object? value) {
  if (value is! Map) return null;
  final lat = value['lat'], lng = value['lng'];
  return lat is num && lng is num ? LatLng(lat.toDouble(), lng.toDouble()) : null;
}

Map<String, double> latLngToJson(LatLng point) => {'lat': point.latitude, 'lng': point.longitude};

const _distance = Distance();

/// Straight-line distance in kilometres.
double distanceKm(LatLng a, LatLng b) => _distance.as(LengthUnit.Meter, a, b) / 1000;

/// Rough minutes to arrive: roads are about 1.4 times longer than a straight line, and Kathmandu traffic
/// averages about 18 km/h (same as the website). Shown as "about N min", never as a promise.
int etaMinutes(LatLng from, LatLng to) {
  final minutes = (distanceKm(from, to) * 1.4 / 18 * 60).round();
  return minutes < 1 ? 1 : minutes;
}
