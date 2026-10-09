import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:tolely/core/network/api_client.dart';

ApiClient clientFor(MockClientHandler handler, {String? token = 'abc'}) => ApiClient(
  baseUrl: 'http://server',
  tokenProvider: () async => token,
  httpClient: MockClient(handler),
  timeout: const Duration(milliseconds: 200),
);

http.Response json(Object body, [int status = 200]) =>
    http.Response(jsonEncode(body), status, headers: {'content-type': 'application/json'});

void main() {
  test('sends the token and a JSON body, and returns the JSON answer', () async {
    late http.Request seen;
    final api = clientFor((request) async {
      seen = request;
      return json({'ok': true});
    });

    final result = await api.post('/api/things', {'a': 1});

    expect(result, {'ok': true});
    expect(seen.method, 'POST');
    expect(seen.url.toString(), 'http://server/api/things');
    expect(seen.headers['authorization'], 'Bearer abc');
    expect(jsonDecode(seen.body), {'a': 1});
  });

  test('sends no authorization header when signed out', () async {
    late http.Request seen;
    final api = clientFor((request) async {
      seen = request;
      return json({});
    }, token: null);
    await api.get('/api/services');
    expect(seen.headers.containsKey('authorization'), isFalse);
  });

  test('uses the right HTTP verb', () async {
    final verbs = <String>[];
    final api = clientFor((request) async {
      verbs.add(request.method);
      return json({});
    });
    await api.get('/x');
    await api.patch('/x', {});
    await api.delete('/x');
    expect(verbs, ['GET', 'PATCH', 'DELETE']);
  });

  test('turns a server error into an ApiException with the server message', () async {
    final api = clientFor((_) async => json({'error': 'Not allowed'}, 403));
    await expectLater(
      api.get('/x'),
      throwsA(
        isA<ApiException>()
            .having((e) => e.message, 'message', 'Not allowed')
            .having((e) => e.statusCode, 'status', 403),
      ),
    );
  });

  test('copes with an error page that is not JSON', () async {
    final api = clientFor((_) async => http.Response('<html>Bad gateway</html>', 502));
    await expectLater(api.get('/x'), throwsA(isA<ApiException>().having((e) => e.statusCode, 'status', 502)));
  });

  test('reports a lost connection as a network error', () async {
    final api = clientFor((_) async => throw const SocketException('no route'));
    await expectLater(api.get('/x'), throwsA(isA<ApiException>().having((e) => e.kind, 'kind', ApiErrorKind.network)));
  });

  test('reports a slow server as a timeout', () async {
    final api = clientFor((_) async {
      await Future<void>.delayed(const Duration(seconds: 1));
      return json({});
    });
    await expectLater(api.get('/x'), throwsA(isA<ApiException>().having((e) => e.kind, 'kind', ApiErrorKind.timeout)));
  });
}
