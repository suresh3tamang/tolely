import 'package:flutter_test/flutter_test.dart';
import 'package:tolely/i18n.dart';
import 'package:tolely/screens/common.dart';

void main() {
  test('rupees formats with thousands separators', () {
    expect(rupees(500), 'Rs 500');
    expect(rupees(12000), 'Rs 12,000');
    expect(rupees(1234567), 'Rs 1,234,567');
  });

  test('tr switches language', () {
    language.value = 'en';
    expect(tr('cash'), 'Cash');
    language.value = 'ne';
    expect(tr('cash'), 'नगद');
    expect(tr('unknown_key'), 'unknown_key');
  });
}
