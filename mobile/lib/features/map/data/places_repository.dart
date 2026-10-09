import 'package:latlong2/latlong.dart';
import 'package:tolely/core/network/api_client.dart';

/// A place found by name, e.g. "Balkot Chowk" in "Suryabinayak-02 · Bhaktapur".
class Place {
  const Place({required this.label, required this.detail, required this.point});

  factory Place.fromJson(Map<String, dynamic> json) => Place(
    label: json['label'] as String? ?? '',
    detail: json['detail'] as String? ?? '',
    point: LatLng((json['lat'] as num).toDouble(), (json['lng'] as num).toDouble()),
  );

  final String label;
  final String detail;
  final LatLng point;
}

/// Place search through the backend (which uses OpenStreetMap and copes with spoken Nepali names).
class PlacesRepository {
  const PlacesRepository(this._api);

  final ApiClient _api;

  Future<List<Place>> search(String query, {required String language}) async {
    final q = Uri.encodeQueryComponent(query.trim());
    final data = await _api.get('/api/places/search?q=$q&lang=$language') as Map<String, dynamic>;
    return [for (final p in data['results'] as List) Place.fromJson(p as Map<String, dynamic>)];
  }
}
