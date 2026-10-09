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
