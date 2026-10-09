import 'package:flutter/material.dart';
import 'package:tolely/core/l10n/l10n.dart';
import 'package:tolely/core/theme/brand.dart';
import 'package:tolely/features/booking/domain/booking.dart';

/// Translated names for booking enums.
extension BookingLabels on AppLocalizations {
  String statusLabel(BookingStatus status) => switch (status) {
    BookingStatus.pending => statusPending,
    BookingStatus.accepted => statusAccepted,
    BookingStatus.onTheWay => statusOnTheWay,
    BookingStatus.completed => statusCompleted,
    BookingStatus.cancelled => statusCancelled,
  };

  String paymentLabel(PaymentMethod method) => switch (method) {
    PaymentMethod.cash => cash,
    PaymentMethod.qr => qr,
  };
}

Color statusColor(BookingStatus status) => switch (status) {
  BookingStatus.pending => const Color(0xFFD97706),
  BookingStatus.accepted => const Color(0xFF0284C7),
  BookingStatus.onTheWay => const Color(0xFF4F46E5),
  BookingStatus.completed => const Color(0xFF059669),
  BookingStatus.cancelled => Brand.muted,
};
