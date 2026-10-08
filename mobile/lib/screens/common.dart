import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';

import '../i18n.dart';
import '../push.dart';
import '../theme.dart';

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

// Each service gets its own colour so tiles are easy to tell apart.
const _serviceColors = <String, Color>{
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

Color serviceColor(String icon) => _serviceColors[icon] ?? Brand.blue;

/// Round coloured icon used for services in lists and cards.
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

/// Shrinks slightly and gives a light haptic tap when pressed.
class Pressable extends StatefulWidget {
  const Pressable({super.key, required this.onTap, required this.child});
  final VoidCallback onTap;
  final Widget child;

  @override
  State<Pressable> createState() => _PressableState();
}

class _PressableState extends State<Pressable> {
  bool _down = false;

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTapDown: (_) => setState(() => _down = true),
    onTapCancel: () => setState(() => _down = false),
    onTapUp: (_) => setState(() => _down = false),
    onTap: () {
      HapticFeedback.lightImpact();
      widget.onTap();
    },
    child: AnimatedScale(
      scale: _down ? 0.96 : 1,
      duration: const Duration(milliseconds: 120),
      curve: Curves.easeOut,
      child: widget.child,
    ),
  );
}

const _statusColors = <String, Color>{
  'pending': Color(0xFFD97706),
  'accepted': Color(0xFF0284C7),
  'on_the_way': Color(0xFF4F46E5),
  'completed': Color(0xFF059669),
  'cancelled': Color(0xFF64748B),
};

Color statusColor(String status) => _statusColors[status] ?? Brand.muted;

class StatusChip extends StatelessWidget {
  const StatusChip(this.status, {super.key});
  final String status;

  @override
  Widget build(BuildContext context) {
    final color = statusColor(status);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(20)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 6,
            height: 6,
            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
          ),
          const SizedBox(width: 6),
          Text(
            tr('status_$status'),
            style: TextStyle(color: color, fontWeight: FontWeight.w700, fontSize: 12.5),
          ),
        ],
      ),
    );
  }
}

/// Button in the app bar to switch between Nepali and English.
class LanguageButton extends StatelessWidget {
  const LanguageButton({super.key});

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(right: 8),
    child: Material(
      color: Colors.white,
      shape: const StadiumBorder(side: BorderSide(color: Brand.line)),
      child: InkWell(
        customBorder: const StadiumBorder(),
        onTap: () {
          HapticFeedback.selectionClick();
          language.value = isNepali ? 'en' : 'ne';
        },
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.translate, size: 16, color: Brand.muted),
              const SizedBox(width: 4),
              Text(
                isNepali ? 'EN' : 'नेपाली',
                style: const TextStyle(fontWeight: FontWeight.w700, color: Brand.ink),
              ),
            ],
          ),
        ),
      ),
    ),
  );
}

/// App bar actions shared by the main screens. Log out lives in Profile.
List<Widget> appBarActions() => [const LanguageButton()];

/// Log out row for the profile screens.
class LogoutButton extends StatelessWidget {
  const LogoutButton({super.key});

  @override
  Widget build(BuildContext context) => OutlinedButton.icon(
    style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(48)),
    onPressed: logOut,
    icon: const Icon(Icons.logout),
    label: Text(tr('logout')),
  );
}

Future<void> callPhone(String? phone) async {
  if (phone == null || phone.isEmpty) return;
  await launchUrl(Uri(scheme: 'tel', path: phone));
}

void showError(BuildContext context, Object error) {
  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error.toString())));
}

/// "From Rs 500" / "Rs 500 देखि" (Nepali puts देखि after the amount).
String fromPrice(int amount) => isNepali ? '${rupees(amount)} देखि' : 'From ${rupees(amount)}';

String rupees(int amount) => 'Rs ${amount.toString().replaceAllMapped(RegExp(r'\B(?=(\d{3})+(?!\d))'), (_) => ',')}';
