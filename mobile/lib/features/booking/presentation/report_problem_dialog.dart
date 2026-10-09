import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:tolely/core/l10n/l10n.dart';
import 'package:tolely/core/widgets/feedback.dart';
import 'package:tolely/features/booking/data/booking_repository.dart';

/// Asks what went wrong and sends it to the Tolely team.
Future<void> reportProblem(BuildContext context, String bookingId) async {
  final controller = TextEditingController();
  final l10n = context.l10n;
  final bookings = context.read<BookingRepository>();
  final message = await showDialog<String>(
    context: context,
    builder: (dialogContext) => AlertDialog(
      title: Text(l10n.reportProblem),
      content: TextField(
        controller: controller,
        autofocus: true,
        maxLines: 4,
        decoration: InputDecoration(hintText: l10n.reportHint),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(dialogContext), child: Text(l10n.cancel)),
        FilledButton(
          style: FilledButton.styleFrom(minimumSize: const Size(0, 44)),
          onPressed: () => Navigator.pop(dialogContext, controller.text),
          child: Text(l10n.send),
        ),
      ],
    ),
  );
  controller.dispose();
  if (message == null || message.trim().isEmpty || !context.mounted) return;
  try {
    await bookings.reportProblem(bookingId, message.trim());
    if (context.mounted) showMessage(context, l10n.reportSent);
  } catch (e) {
    if (context.mounted) showError(context, e);
  }
}
