import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:tolely/core/config/env.dart';
import 'package:tolely/core/l10n/l10n.dart';
import 'package:tolely/core/l10n/locale_controller.dart';
import 'package:tolely/core/navigation/root_keys.dart';
import 'package:tolely/core/network/api_client.dart';
import 'package:tolely/core/services/location_service.dart';
import 'package:tolely/core/services/push_service.dart';
import 'package:tolely/core/services/speech_service.dart';
import 'package:tolely/features/auth/data/auth_repository.dart';
import 'package:tolely/features/booking/data/booking_repository.dart';
import 'package:tolely/features/catalog/data/catalog_repository.dart';
import 'package:tolely/features/map/data/places_repository.dart';
import 'package:tolely/features/notifications/data/notifications_repository.dart';
import 'package:tolely/features/profile/data/profile_repository.dart';
import 'package:tolely/features/supplier/data/supplier_repository.dart';
import 'package:tolely/features/voice/data/voice_repository.dart';

/// Everything the app shares, created once at start-up.
///
/// This is the only place that builds repositories and services. Screens get
/// them with `context.read<BookingRepository>()`, and tests can replace any of
/// them with a fake by providing their own value above the screen.
class AppDependencies {
  AppDependencies._({
    required this.auth,
    required this.api,
    required this.catalog,
    required this.profile,
    required this.suppliers,
    required this.bookings,
    required this.push,
    required this.locale,
    required this.location,
    required this.voice,
    required this.speech,
    required this.places,
    required this.notifications,
  });

  static Future<AppDependencies> create() async {
    final auth = AuthRepository();
    final api = ApiClient(baseUrl: Env.apiBaseUrl, tokenProvider: auth.idToken);
    final profile = ProfileRepository(api);
    final locale = await LocaleController.load(
      // Keep the server in step so push notifications use the chosen language.
      onChanged: (code) async {
        if (auth.currentUid != null) await profile.saveLanguage(code);
      },
    );
    late final PushService push;
    push = PushService(
      registerDevice: profile.registerDevice,
      // A push that arrives while the app is open: show it, with a way to open the booking.
      onForegroundMessage: (text, bookingId) {
        final context = rootNavigatorKey.currentContext;
        rootMessengerKey.currentState?.showSnackBar(
          SnackBar(
            content: Text(text),
            action: bookingId == null || context == null
                ? null
                : SnackBarAction(
                    label: AppLocalizations.of(context).open,
                    onPressed: () => push.openBooking(bookingId),
                  ),
          ),
        );
      },
    );
    return AppDependencies._(
      auth: auth,
      api: api,
      catalog: CatalogRepository(api),
      profile: profile,
      suppliers: SupplierRepository(api),
      bookings: BookingRepository(api),
      push: push,
      locale: locale,
      location: const LocationService(),
      voice: VoiceRepository(api),
      speech: DeviceSpeechService(),
      places: PlacesRepository(api),
      notifications: NotificationsRepository(api),
    );
  }

  final AuthRepository auth;
  final ApiClient api;
  final CatalogRepository catalog;
  final ProfileRepository profile;
  final SupplierRepository suppliers;
  final BookingRepository bookings;
  final PushService push;
  final LocaleController locale;
  final LocationService location;
  final VoiceRepository voice;
  final SpeechService speech;
  final PlacesRepository places;
  final NotificationsRepository notifications;

  /// Wraps [child] so every screen can read these.
  Widget provide({required Widget child}) => MultiProvider(
    providers: [
      Provider<AuthRepository>.value(value: auth),
      Provider<ApiClient>.value(value: api),
      Provider<CatalogRepository>.value(value: catalog),
      Provider<ProfileRepository>.value(value: profile),
      Provider<SupplierRepository>.value(value: suppliers),
      Provider<BookingRepository>.value(value: bookings),
      Provider<PushService>.value(value: push),
      Provider<LocationService>.value(value: location),
      Provider<VoiceRepository>.value(value: voice),
      Provider<SpeechService>.value(value: speech),
      Provider<PlacesRepository>.value(value: places),
      Provider<NotificationsRepository>.value(value: notifications),
      ChangeNotifierProvider<LocaleController>.value(value: locale),
    ],
    child: child,
  );
}
