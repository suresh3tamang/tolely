import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Tolely brand colours and the app-wide theme.
class Brand {
  static const blue = Color(0xFF0369A1);
  static const deepBlue = Color(0xFF075985);
  static const amber = Color(0xFFF59E0B);
  static const ink = Color(0xFF0F172A);
  static const muted = Color(0xFF64748B);
  static const line = Color(0xFFE2E8F0);
  static const background = Color(0xFFF6F8FB);
}

ThemeData buildTheme() {
  final scheme = ColorScheme.fromSeed(
    seedColor: Brand.blue,
    primary: Brand.blue,
    secondary: Brand.amber,
    surface: Colors.white,
  );
  // Mukta covers both Nepali (Devanagari) and English nicely.
  final text = GoogleFonts.muktaTextTheme().apply(bodyColor: Brand.ink, displayColor: Brand.ink);
  final rounded = RoundedRectangleBorder(borderRadius: BorderRadius.circular(16));

  return ThemeData(
    useMaterial3: true,
    colorScheme: scheme,
    scaffoldBackgroundColor: Brand.background,
    textTheme: text.copyWith(
      headlineSmall: text.headlineSmall?.copyWith(fontWeight: FontWeight.w700, height: 1.2),
      titleLarge: text.titleLarge?.copyWith(fontWeight: FontWeight.w700),
      titleMedium: text.titleMedium?.copyWith(fontWeight: FontWeight.w600),
    ),
    splashFactory: InkSparkle.splashFactory,
    appBarTheme: AppBarTheme(
      backgroundColor: Brand.background,
      surfaceTintColor: Colors.transparent,
      scrolledUnderElevation: 0,
      elevation: 0,
      centerTitle: false,
      titleTextStyle: text.titleLarge?.copyWith(color: Brand.ink, fontWeight: FontWeight.w700),
      iconTheme: const IconThemeData(color: Brand.ink),
    ),
    cardTheme: CardThemeData(
      color: Colors.white,
      elevation: 0,
      margin: const EdgeInsets.symmetric(vertical: 6),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: const BorderSide(color: Brand.line),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: Brand.line),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: Brand.line),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: Brand.blue, width: 1.5),
      ),
      labelStyle: const TextStyle(color: Brand.muted),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        minimumSize: const Size.fromHeight(52),
        shape: rounded,
        textStyle: text.titleMedium?.copyWith(fontWeight: FontWeight.w700),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        minimumSize: const Size(0, 44),
        shape: rounded,
        side: const BorderSide(color: Brand.line),
        foregroundColor: Brand.ink,
      ),
    ),
    textButtonTheme: TextButtonThemeData(style: TextButton.styleFrom(shape: rounded)),
    segmentedButtonTheme: SegmentedButtonThemeData(
      style: SegmentedButton.styleFrom(
        selectedBackgroundColor: Brand.blue.withValues(alpha: 0.12),
        selectedForegroundColor: Brand.deepBlue,
        side: const BorderSide(color: Brand.line),
      ),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: Colors.white,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      height: 64,
      indicatorColor: Colors.transparent,
      labelTextStyle: WidgetStateProperty.resolveWith(
        (s) => text.labelMedium?.copyWith(
          fontWeight: s.contains(WidgetState.selected) ? FontWeight.w700 : FontWeight.w500,
          color: s.contains(WidgetState.selected) ? Brand.blue : Brand.muted,
        ),
      ),
      iconTheme: WidgetStateProperty.resolveWith(
        (s) => IconThemeData(color: s.contains(WidgetState.selected) ? Brand.blue : Brand.muted, size: 26),
      ),
    ),
    tabBarTheme: TabBarThemeData(
      labelColor: Brand.blue,
      unselectedLabelColor: Brand.muted,
      indicatorColor: Brand.blue,
      dividerColor: Brand.line,
      labelStyle: text.titleSmall?.copyWith(fontWeight: FontWeight.w700),
    ),
    snackBarTheme: SnackBarThemeData(behavior: SnackBarBehavior.floating, shape: rounded, backgroundColor: Brand.ink),
    dialogTheme: DialogThemeData(shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24))),
    dividerTheme: const DividerThemeData(color: Brand.line, space: 24),
    listTileTheme: const ListTileThemeData(iconColor: Brand.muted),
  );
}
