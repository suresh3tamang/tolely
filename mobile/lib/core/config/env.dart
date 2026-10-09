/// Build-time settings, passed with `--dart-define`:
///
///   flutter run --dart-define=API_BASE_URL=http://192.168.1.10:3000
///
/// (Android emulator: http://10.0.2.2:3000, iOS simulator: http://localhost:3000)
class Env {
  const Env._();

  /// Address of the Next.js backend.
  static const apiBaseUrl = String.fromEnvironment('API_BASE_URL', defaultValue: 'http://10.0.2.2:3000');

  /// Use local Firebase emulators instead of the real project:
  /// `--dart-define=USE_EMULATORS=true`.
  static const useEmulators = bool.fromEnvironment('USE_EMULATORS');
}
