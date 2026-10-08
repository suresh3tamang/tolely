import 'dart:convert';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:http/http.dart' as http;

import 'config.dart';
import 'i18n.dart';
import 'models.dart';

class ApiException implements Exception {
  ApiException(this.message);
  final String message;
  @override
  String toString() => message;
}

/// Talks to the Next.js backend. All writes go through here; the server
/// checks the user's role and decides prices.
class Api {
  static Future<dynamic> _send(String method, String path, [Map<String, dynamic>? body]) async {
    final token = await FirebaseAuth.instance.currentUser?.getIdToken();
    final req = http.Request(method, Uri.parse('$apiBaseUrl$path'))
      ..headers['content-type'] = 'application/json'
      ..headers['authorization'] = 'Bearer $token';
    if (body != null) req.body = jsonEncode(body);

    final res = await http.Response.fromStream(await req.send());
    final data = res.body.isEmpty ? null : jsonDecode(res.body);
    if (res.statusCode >= 400) {
      throw ApiException((data is Map ? data['error'] : null) ?? 'Something went wrong');
    }
    return data;
  }

  static Future<List<Service>> services() async {
    final data = await _send('GET', '/api/services');
    return (data['services'] as List).map((s) => Service.fromJson(s)).toList();
  }

  /// Returns {user, supplier}; either may be null.
  static Future<Map<String, dynamic>> me() async => Map<String, dynamic>.from(await _send('GET', '/api/me'));

  static Future<void> saveCustomerProfile({
    required String name,
    required String address,
    required String landmark,
  }) =>
      _send('POST', '/api/me', {'name': name, 'address': address, 'landmark': landmark, 'language': language.value});

  static Future<void> registerSupplier({
    required String name,
    required String area,
    required List<String> services,
    String vehicleNo = '',
    String waterSource = '',
  }) =>
      _send('POST', '/api/suppliers/register', {
        'name': name,
        'area': area,
        'services': services,
        'vehicleNo': vehicleNo,
        'waterSource': waterSource,
      });

  static Future<void> createBooking({
    required String serviceKey,
    required String optionId,
    required String address,
    required String landmark,
    required DateTime scheduledFor,
    required String paymentMethod,
    required String note,
  }) =>
      _send('POST', '/api/bookings', {
        'serviceKey': serviceKey,
        'optionId': optionId,
        'address': address,
        'landmark': landmark,
        'scheduledFor': scheduledFor.toUtc().toIso8601String(),
        'paymentMethod': paymentMethod,
        'note': note,
      });

  static Future<void> cancelBooking(String id) => _send('POST', '/api/bookings/$id/cancel');

  static Future<void> rateBooking(String id, int rating) =>
      _send('POST', '/api/bookings/$id/rate', {'rating': rating});

  static Future<void> acceptJob(String id) => _send('POST', '/api/bookings/$id/accept');

  static Future<void> setJobStatus(String id, String status) =>
      _send('POST', '/api/bookings/$id/status', {'status': status});
}
