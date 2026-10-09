import 'package:tolely/core/network/api_client.dart';

/// Actions only suppliers take: signing up and going online or offline.
class SupplierRepository {
  const SupplierRepository(this._api);

  final ApiClient _api;

  /// Registers (or updates) the caller as a supplier. Every change puts the
  /// account back to "waiting for verification".
  Future<void> register({
    required String name,
    required String area,
    required List<String> services,
    required String language,
    String vehicleNo = '',
    String waterSource = '',
  }) => _api.post('/api/suppliers/register', {
    'name': name,
    'area': area,
    'services': services,
    'vehicleNo': vehicleNo,
    'waterSource': waterSource,
    'language': language,
  });

  Future<void> setOnline(bool online) => _api.post('/api/suppliers/availability', {'online': online});
}
