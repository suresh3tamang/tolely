import 'package:url_launcher/url_launcher.dart';

/// Opens the phone dialler with [phone] filled in. Does nothing for empty numbers.
Future<void> callPhone(String? phone) async {
  if (phone == null || phone.isEmpty) return;
  await launchUrl(Uri(scheme: 'tel', path: phone));
}
