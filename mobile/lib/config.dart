/// Address of the Next.js backend. Override when running:
///   flutter run --dart-define=API_BASE_URL=http://192.168.1.10:3000
/// (Android emulator: http://10.0.2.2:3000, iOS simulator: http://localhost:3000)
const apiBaseUrl = String.fromEnvironment('API_BASE_URL', defaultValue: 'http://10.0.2.2:3000');

/// Set to true to use local Firebase emulators instead of a real project:
///   flutter run --dart-define=USE_EMULATORS=true
const useEmulators = bool.fromEnvironment('USE_EMULATORS');
