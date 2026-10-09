import 'package:tolely/core/network/api_client.dart';
import 'package:tolely/features/catalog/domain/service.dart';

/// The list of bookable services and their prices (managed in the admin dashboard).
class CatalogRepository {
  const CatalogRepository(this._api);

  final ApiClient _api;

  Future<List<Service>> services() async {
    final data = await _api.get('/api/services') as Map<String, dynamic>;
    return (data['services'] as List).map((s) => Service.fromJson(s as Map<String, dynamic>)).toList();
  }
}
