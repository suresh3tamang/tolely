# Tolely mobile app

Flutter app (Android + iOS) for customers and suppliers.
Architecture and conventions: [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md).

```bash
flutter pub get                 # also generates the translations
flutter run --dart-define=API_BASE_URL=http://<your-computer-ip>:3000
flutter test                    # unit + screen tests
flutter analyze
flutter build apk --release --dart-define=API_BASE_URL=http://<your-computer-ip>:3000
```

Texts are in `lib/l10n/*.arb`. Firebase is configured by `flutterfire configure`.
