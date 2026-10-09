import 'package:tolely/core/network/api_client.dart';
import 'package:tolely/features/profile/domain/session.dart';

/// The signed-in person's profile, language, device and account.
class ProfileRepository {
  const ProfileRepository(this._api);

  final ApiClient _api;

  Future<Session> session() async => Session.fromJson(Map<String, dynamic>.from(await _api.get('/api/me') as Map));

  /// Creates or updates a customer profile. New accounts start as customers.
  Future<void> saveCustomerProfile({
    required String name,
    required String address,
    required String landmark,
    required String language,
  }) => _api.post('/api/me', {'name': name, 'address': address, 'landmark': landmark, 'language': language});

  /// Saves only the preferred language (used for push notification text).
  Future<void> saveLanguage(String language) => _api.patch('/api/me', {'language': language});

  /// Registers (or with [remove], unregisters) this phone for push notifications.
  Future<void> registerDevice(String token, {bool remove = false}) =>
      _api.post('/api/me/device', {'token': token, 'remove': remove});

  /// Permanently deletes the account. Fails while bookings are still open.
  Future<void> deleteAccount() => _api.delete('/api/me');
}
