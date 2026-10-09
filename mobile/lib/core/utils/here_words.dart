// "aile basirako gharma", "mero ghar", "yahi", "here": the customer means where they are now.
// Such phrases use the phone's current location instead of searching the map.
// Keep in step with web/src/shared/here-words.ts.

const _latin = [
  'mero ghar', 'hamro ghar', 'aile basirako', 'ahile basirako', 'basirako', 'basirahe', 'basdai', 'baseko thau',
  'gharma', 'ghar ma', 'ghar mai', 'yahi', 'yahin', 'yaha', 'yahan', 'here', 'my home', 'my house', 'my place',
  'current location', 'my location', 'where i am', "where i'm", 'this place',
];
const _devanagari = ['मेरो घर', 'हाम्रो घर', 'बसिरहेको', 'बसिराखेको', 'बस्दै', 'बसेको ठाउँ', 'घरमा', 'घर मा', 'यहीँ', 'यहीं', 'यही', 'यहाँ'];

/// True if [text] asks for "where I am now" rather than naming a place.
bool meansCurrentLocation(String text) {
  final t = ' ${text.toLowerCase().replaceAll(RegExp(r'''[.,!?।'"]'''), ' ').replaceAll(RegExp(r'\s+'), ' ').trim()} ';
  return _latin.any((w) => t.contains(' $w')) || _devanagari.any(t.contains);
}
