import 'package:flutter/material.dart';
import 'package:tolely/core/errors/app_exception.dart';
import 'package:tolely/core/l10n/l10n.dart';
import 'package:tolely/core/network/api_client.dart';
import 'package:tolely/features/auth/data/auth_repository.dart';

/// A readable, translated message for any error.
String errorMessage(BuildContext context, Object error) {
  if (error is ApiException) {
    switch (error.kind) {
      case ApiErrorKind.network:
        return context.l10n.errorNetwork;
      case ApiErrorKind.timeout:
        return context.l10n.errorTimeout;
      case ApiErrorKind.server:
        return error.message; // already written for people by the server
    }
  }
  if (error is AuthFailure) {
    final l10n = context.l10n;
    return switch (error.reason) {
      AuthFailureReason.smsNotAvailable => l10n.authSmsNotAvailable,
      AuthFailureReason.wrongCode => l10n.authWrongCode,
      AuthFailureReason.codeExpired => l10n.authCodeExpired,
      AuthFailureReason.tooManyTries => l10n.authTooManyTries,
      AuthFailureReason.network => l10n.errorNetwork,
      AuthFailureReason.badNumber => l10n.invalidPhone,
      AuthFailureReason.other => error.message,
    };
  }
  if (error is AppException) return error.message;
  return context.l10n.errorGeneric;
}

void showError(BuildContext context, Object error) {
  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(errorMessage(context, error))));
}

void showMessage(BuildContext context, String message) {
  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
}
