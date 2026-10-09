import 'package:flutter_test/flutter_test.dart';
import 'package:tolely/core/utils/here_words.dart';

void main() {
  test('"where I am now" phrases', () {
    for (final text in ['aile basirako gharma', 'mero ghar', 'Mero gharma', 'yahi', 'here', 'my home', 'अहिले बसिरहेको घरमा', 'मेरो घर', 'यहीँ']) {
      expect(meansCurrentLocation(text), isTrue, reason: text);
    }
  });

  test('place names are not', () {
    for (final text in ['Balkot chowk', 'Gharipatan', 'Koteshwor', 'बालकोट चोक', 'there', 'Thimi']) {
      expect(meansCurrentLocation(text), isFalse, reason: text);
    }
  });
}
