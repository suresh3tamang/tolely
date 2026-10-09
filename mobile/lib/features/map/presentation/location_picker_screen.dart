import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';
import 'package:tolely/core/l10n/l10n.dart';
import 'package:tolely/core/l10n/locale_controller.dart';
import 'package:tolely/core/services/speech_service.dart';
import 'package:tolely/core/services/location_service.dart';
import 'package:tolely/core/utils/geo.dart';
import 'package:tolely/core/utils/here_words.dart';
import 'package:tolely/core/widgets/feedback.dart';
import 'package:tolely/core/widgets/map_tiles.dart';
import 'package:tolely/features/map/data/places_repository.dart';

/// Full-screen map: search a place by typing or speaking ("Balkot chowk"), then move the map so the pin
/// sits on your house, and confirm.
/// Returns the chosen [LatLng] with `Navigator.pop`.
class LocationPickerScreen extends StatefulWidget {
  const LocationPickerScreen({super.key, this.initial});

  final LatLng? initial;

  @override
  State<LocationPickerScreen> createState() => _LocationPickerScreenState();
}

class _LocationPickerScreenState extends State<LocationPickerScreen> {
  final _map = MapController();
  late LatLng _center = widget.initial ?? kathmandu;
  bool _locating = false;
  final _query = TextEditingController();
  bool _listening = false;
  bool _searching = false;
  List<Place> _others = const [];

  @override
  void initState() {
    super.initState();
    if (widget.initial == null) _goToMe();
  }

  @override
  void dispose() {
    if (_listening) context.read<SpeechService>().stop();
    _map.dispose();
    _query.dispose();
    super.dispose();
  }

  Future<void> _goToMe() async {
    setState(() => _locating = true);
    final me = await context.read<LocationService>().currentPosition();
    if (!mounted) return;
    setState(() => _locating = false);
    if (me == null) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(context.l10n.locationOff)));
      return;
    }
    _center = me;
    _map.move(me, 17);
  }

  /// Finds the place, moves the map there, and lists other matches in case the first is wrong.
  Future<void> _search([String? said]) async {
    final q = (said ?? _query.text).trim();
    if (q.length < 2 || _searching) return;
    FocusScope.of(context).unfocus();
    // "mero ghar", "yahi", "aile basirako gharma": use where they are now.
    if (meansCurrentLocation(q)) {
      _query.clear();
      setState(() => _others = const []);
      return _goToMe();
    }
    final l10n = context.l10n;
    setState(() {
      _searching = true;
      _others = const [];
    });
    try {
      final places = await context.read<PlacesRepository>().search(q, language: context.read<LocaleController>().code);
      if (!mounted) return;
      if (places.isEmpty) {
        showMessage(context, l10n.noPlaces);
      } else {
        _goTo(places.first);
        setState(() => _others = places.skip(1).take(4).toList());
      }
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => _searching = false);
    }
  }

  void _goTo(Place place) {
    _center = place.point;
    _map.move(place.point, 17);
    setState(() => _others = const []);
  }

  /// Say the place name; the words fill the box and the map moves there.
  Future<void> _listen() async {
    final speech = context.read<SpeechService>();
    if (_listening) return speech.stop();
    final nepali = context.read<LocaleController>().isNepali;
    final l10n = context.l10n;
    var words = '';
    setState(() {
      _listening = true;
      _others = const [];
    });
    final ok = await speech.start(
      localeId: nepali ? 'ne_NP' : 'en_IN',
      onWords: (w, _) {
        words = w;
        if (mounted) _query.text = w;
      },
      onError: (_) {
        if (mounted) setState(() => _listening = false);
      },
      onDone: () {
        if (!mounted || !_listening) return;
        setState(() => _listening = false);
        if (words.trim().length >= 2) _search(words);
      },
    );
    if (!ok && mounted) {
      setState(() => _listening = false);
      showMessage(context, l10n.micBlocked);
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final color = Theme.of(context).colorScheme.primary;
    return Scaffold(
      appBar: AppBar(title: Text(l10n.pinLocation)),
      body: Stack(
        children: [
          FlutterMap(
            mapController: _map,
            options: MapOptions(
              initialCenter: _center,
              initialZoom: widget.initial == null ? 13 : 17,
              onPositionChanged: (camera, _) => _center = camera.center,
            ),
            children: [osmTiles()],
          ),
          // Fixed pin in the middle; the map moves underneath it.
          IgnorePointer(
            child: Center(
              child: Padding(
                padding: const EdgeInsets.only(bottom: 40),
                child: Icon(Icons.location_on, size: 48, color: color),
              ),
            ),
          ),
          Positioned(
            left: 12,
            right: 12,
            top: 12,
            child: Card(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(12, 8, 8, 10),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TextField(
                      controller: _query,
                      textInputAction: TextInputAction.search,
                      onSubmitted: _search,
                      decoration: InputDecoration(
                        hintText: _listening ? l10n.voiceListening : l10n.searchPlace,
                        border: InputBorder.none,
                        prefixIcon: const Icon(Icons.search),
                        suffixIcon: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            if (_searching)
                              const Padding(
                                padding: EdgeInsets.all(12),
                                child: SizedBox.square(dimension: 18, child: CircularProgressIndicator(strokeWidth: 2)),
                              ),
                            IconButton(
                              tooltip: l10n.searchByVoice,
                              onPressed: _listen,
                              icon: Icon(_listening ? Icons.stop_circle : Icons.mic, color: _listening ? Colors.red : color),
                            ),
                          ],
                        ),
                      ),
                    ),
                    if (_others.isNotEmpty) ...[
                      const Divider(height: 1),
                      for (final p in _others)
                        ListTile(
                          dense: true,
                          leading: const Icon(Icons.place_outlined),
                          title: Text(p.label),
                          subtitle: p.detail.isEmpty ? null : Text(p.detail, maxLines: 1, overflow: TextOverflow.ellipsis),
                          onTap: () => _goTo(p),
                        ),
                    ] else
                      Text(l10n.pinHelp, textAlign: TextAlign.center, style: Theme.of(context).textTheme.bodySmall),
                  ],
                ),
              ),
            ),
          ),
          Positioned(
            right: 16,
            bottom: 100,
            child: FloatingActionButton.small(
              heroTag: 'me',
              onPressed: _locating ? null : _goToMe,
              child: _locating
                  ? const SizedBox.square(dimension: 18, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Icon(Icons.my_location),
            ),
          ),
          const Positioned(
            left: 8,
            bottom: 84,
            child: Text('© OpenStreetMap', style: TextStyle(fontSize: 10, color: Colors.black54)),
          ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: FilledButton.icon(
            icon: const Icon(Icons.check),
            label: Text(l10n.confirmLocation),
            onPressed: () => Navigator.pop(context, _center),
          ),
        ),
      ),
    );
  }
}
