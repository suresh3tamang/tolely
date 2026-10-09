import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:tolely/core/network/api_client.dart';
import 'package:tolely/features/catalog/data/catalog_repository.dart';

void main() {
  test('reads services, options and prices from the API', () async {
    final api = ApiClient(
      baseUrl: 'http://server',
      tokenProvider: () async => null,
      httpClient: MockClient(
        (request) async => http.Response(
          jsonEncode({
            'services': [
              {
                'key': 'tanker',
                'nameEn': 'Water Tanker',
                'nameNe': 'पानी ट्याङ्कर',
                'icon': 'water_drop',
                'options': [
                  {'id': '12000L', 'labelEn': '12,000 Liters', 'labelNe': '१२,००० लिटर', 'price': 4500},
                  {'id': '6000L', 'labelEn': '6,000 Liters', 'labelNe': '६,००० लिटर', 'price': 2500},
                ],
              },
            ],
          }),
          200,
          headers: {'content-type': 'application/json; charset=utf-8'}, // Nepali text needs UTF-8
        ),
      ),
    );

    final services = await CatalogRepository(api).services();

    expect(services, hasLength(1));
    expect(services.first.name.resolve('ne'), 'पानी ट्याङ्कर');
    expect(services.first.options, hasLength(2));
    // "From Rs ..." must show the cheapest option, whatever order the server sends.
    expect(services.first.cheapest.price, 2500);
  });
}
