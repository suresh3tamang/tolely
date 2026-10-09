import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:tolely/core/errors/app_exception.dart';

enum ApiErrorKind {
  /// No connection, or the server could not be reached.
  network,

  /// The server took too long to answer.
  timeout,

  /// The server answered with an error; [ApiException.message] says why.
  server,
}

class ApiException implements AppException {
  const ApiException(this.message, {this.kind = ApiErrorKind.server, this.statusCode});

  @override
  final String message;
  final ApiErrorKind kind;
  final int? statusCode;

  @override
  String toString() => message;
}

typedef TokenProvider = Future<String?> Function();

/// Thin JSON client for the Next.js backend. Sends the signed-in user's
/// Firebase ID token; the server checks roles and decides prices.
///
/// Feature code never uses this directly: it goes through that feature's
/// repository (see `features/*/data`).
class ApiClient {
  ApiClient({
    required this.baseUrl,
    required this.tokenProvider,
    http.Client? httpClient,
    this.timeout = const Duration(seconds: 20),
  }) : _http = httpClient ?? http.Client();

  final String baseUrl;
  final TokenProvider tokenProvider;
  final Duration timeout;
  final http.Client _http;

  Future<dynamic> get(String path) => _send('GET', path);

  Future<dynamic> post(String path, [Map<String, dynamic>? body]) => _send('POST', path, body);

  Future<dynamic> patch(String path, [Map<String, dynamic>? body]) => _send('PATCH', path, body);

  Future<dynamic> delete(String path) => _send('DELETE', path);

  Future<dynamic> _send(String method, String path, [Map<String, dynamic>? body]) async {
    final token = await tokenProvider();
    final request = http.Request(method, Uri.parse('$baseUrl$path'))
      ..headers['content-type'] = 'application/json'
      ..headers['accept'] = 'application/json';
    if (token != null) request.headers['authorization'] = 'Bearer $token';
    if (body != null) request.body = jsonEncode(body);

    final http.Response response;
    try {
      response = await http.Response.fromStream(await _http.send(request).timeout(timeout));
    } on TimeoutException {
      throw const ApiException('Timed out', kind: ApiErrorKind.timeout);
    } on http.ClientException catch (e) {
      throw ApiException(e.message, kind: ApiErrorKind.network);
    } catch (e) {
      // SocketException and friends: no route to the server.
      throw ApiException('$e', kind: ApiErrorKind.network);
    }

    dynamic data;
    if (response.body.isNotEmpty) {
      try {
        data = jsonDecode(response.body);
      } on FormatException {
        // Not JSON (e.g. a proxy error page).
        if (response.statusCode < 400) rethrow;
      }
    }
    if (response.statusCode >= 400) {
      final message = data is Map ? data['error'] as String? : null;
      throw ApiException(message ?? 'Server error (${response.statusCode})', statusCode: response.statusCode);
    }
    return data;
  }
}
