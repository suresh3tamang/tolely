import 'package:flutter/material.dart';
import 'package:tolely/core/theme/brand.dart';

// The admin dashboard picks an icon NAME for each service. To add an icon,
// add its name to SERVICE_ICONS in web/src/lib/services.ts and to both maps here.
const _icons = <String, IconData>{
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

// Each service gets its own colour so tiles are easy to tell apart.
const _colors = <String, Color>{
  'water_drop': Color(0xFF0284C7),
  'cleaning_services': Color(0xFF059669),
  'plumbing': Color(0xFFEA580C),
  'electrical_services': Color(0xFFCA8A04),
  'local_shipping': Color(0xFF7C3AED),
  'format_paint': Color(0xFFDB2777),
  'ac_unit': Color(0xFF0891B2),
  'carpenter': Color(0xFF92400E),
  'handyman': Color(0xFF475569),
};

IconData serviceIcon(String name) => _icons[name] ?? Icons.handyman;

Color serviceColor(String name) => _colors[name] ?? Brand.blue;

/// Rounded, softly coloured icon used for a service in lists and tiles.
class ServiceAvatar extends StatelessWidget {
  const ServiceAvatar(this.icon, {super.key, this.size = 44});

  final String icon;
  final double size;

  @override
  Widget build(BuildContext context) {
    final color = serviceColor(icon);
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(color: color.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(size * 0.32)),
      child: Icon(serviceIcon(icon), color: color, size: size * 0.55),
    );
  }
}
