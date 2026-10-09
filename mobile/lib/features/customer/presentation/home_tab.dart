import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:tolely/core/l10n/l10n.dart';
import 'package:tolely/core/theme/brand.dart';
import 'package:tolely/core/widgets/feedback.dart';
import 'package:tolely/core/widgets/language_button.dart';
import 'package:tolely/features/booking/presentation/book_screen.dart';
import 'package:tolely/features/catalog/data/catalog_repository.dart';
import 'package:tolely/features/catalog/domain/service.dart';
import 'package:tolely/features/customer/presentation/active_booking_card.dart';
import 'package:tolely/features/customer/presentation/service_tile.dart';
import 'package:tolely/features/customer/presentation/tip_banner.dart';
import 'package:tolely/features/voice/domain/voice_draft.dart';
import 'package:tolely/features/profile/domain/user_profile.dart';
import 'package:tolely/features/voice/presentation/voice_card.dart';
import 'package:tolely/features/voice/presentation/voice_sheet.dart';

/// Home: greeting, the active booking, and a tile for each service.
class HomeTab extends StatefulWidget {
  const HomeTab({super.key, required this.profile, required this.onBooked});

  final UserProfile profile;

  /// Called after the customer completes a booking.
  final VoidCallback onBooked;

  @override
  State<HomeTab> createState() => _HomeTabState();
}

class _HomeTabState extends State<HomeTab> {
  late Future<List<Service>> _services;

  @override
  void initState() {
    super.initState();
    _services = context.read<CatalogRepository>().services();
  }

  Future<void> _refresh() async {
    final next = context.read<CatalogRepository>().services();
    setState(() {
      _services = next;
    });
    await next;
  }

  Future<void> _book(Service service, {VoiceDraft? draft}) async {
    final booked = await Navigator.push<bool>(
      context,
      MaterialPageRoute(
        builder: (_) => BookScreen(service: service, profile: widget.profile, draft: draft),
      ),
    );
    if (booked == true) widget.onBooked();
  }

  /// Book by voice: the sheet returns what was understood, and the booking screen opens filled in.
  Future<void> _bookByVoice() async {
    final draft = await showVoiceSheet(context);
    if (draft == null || !mounted) return;
    final services = await _services;
    final service = services.where((s) => s.key == draft.serviceKey).firstOrNull;
    if (service != null && mounted) await _book(service, draft: draft);
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final text = Theme.of(context).textTheme;
    final area = widget.profile.address;

    return SafeArea(
      bottom: false,
      child: RefreshIndicator(
        onRefresh: _refresh,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
          children: [
            // Greeting header
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('${l10n.namaste}, ${widget.profile.firstName} 👋', style: text.headlineSmall),
                      if (area.isNotEmpty) ...[
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            const Icon(Icons.location_on, size: 16, color: Brand.amber),
                            const SizedBox(width: 4),
                            Flexible(
                              child: Text(
                                area,
                                overflow: TextOverflow.ellipsis,
                                style: text.bodyMedium?.copyWith(color: Brand.muted),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
                const LanguageButton(),
              ],
            ),
            const SizedBox(height: 20),
            const ActiveBookingCard(),
            VoiceCard(onTap: _bookByVoice),
            const SizedBox(height: 20),
            Text(l10n.whatDoYouNeed, style: text.titleLarge),
            const SizedBox(height: 12),
            FutureBuilder<List<Service>>(
              future: _services,
              builder: (context, snapshot) {
                if (snapshot.hasError) return Text(errorMessage(context, snapshot.error!));
                final services = snapshot.data;
                if (services == null) {
                  return const Padding(
                    padding: EdgeInsets.all(32),
                    child: Center(child: CircularProgressIndicator()),
                  );
                }
                return GridView.count(
                  crossAxisCount: 2,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  mainAxisSpacing: 14,
                  crossAxisSpacing: 14,
                  childAspectRatio: 0.95,
                  children: [for (final s in services) ServiceTile(service: s, onTap: () => _book(s))],
                );
              },
            ),
            const SizedBox(height: 20),
            const TipBanner(),
          ],
        ),
      ),
    );
  }
}
