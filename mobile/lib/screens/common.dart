import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../i18n.dart';
import '../push.dart';

const _serviceIcons = <String, IconData>{
  'water_drop': Icons.water_drop,
  'cleaning_services': Icons.cleaning_services,
  'plumbing': Icons.plumbing,
  'electrical_services': Icons.electrical_services,
  'local_shipping': Icons.local_shipping,
  'format_paint': Icons.format_paint,
  'ac_unit': Icons.ac_unit,
  'carpenter': Icons.carpenter,
  'handyman': Icons.handyman,
};

IconData serviceIcon(String name) => _serviceIcons[name] ?? Icons.handyman;

const _statusColors = <String, Color>{
  'pending': Colors.orange,
  'accepted': Colors.blue,
  'on_the_way': Colors.indigo,
  'completed': Colors.green,
  'cancelled': Colors.grey,
};

class StatusChip extends StatelessWidget {
  const StatusChip(this.status, {super.key});
  final String status;

  @override
  Widget build(BuildContext context) {
    final color = _statusColors[status] ?? Colors.grey;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(20)),
      child: Text(
        tr('status_$status'),
        style: TextStyle(color: color, fontWeight: FontWeight.w600),
      ),
    );
  }
}

/// Button in the app bar to switch between Nepali and English.
class LanguageButton extends StatelessWidget {
  const LanguageButton({super.key});

  @override
  Widget build(BuildContext context) =>
      TextButton(onPressed: () => language.value = isNepali ? 'en' : 'ne', child: Text(isNepali ? 'EN' : 'ने'));
}

/// App bar actions shared by the home screens: language switch + log out.
List<Widget> appBarActions() => [
  const LanguageButton(),
  IconButton(tooltip: tr('logout'), icon: const Icon(Icons.logout), onPressed: logOut),
];

Future<void> callPhone(String? phone) async {
  if (phone == null || phone.isEmpty) return;
  await launchUrl(Uri(scheme: 'tel', path: phone));
}

void showError(BuildContext context, Object error) {
  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.toString())));
}

String rupees(int amount) => 'Rs ${amount.toString().replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (_) => ',')}';
