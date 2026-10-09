import 'package:flutter/material.dart';
import 'package:tolely/core/l10n/l10n.dart';
import 'package:tolely/core/widgets/feedback.dart';
import 'package:tolely/features/booking/domain/booking.dart';
import 'package:tolely/features/supplier/presentation/job_card.dart';

/// A live list of jobs from [stream], optionally filtered and sorted.
class JobList extends StatelessWidget {
  const JobList({super.key, required this.stream, this.filter, this.soonestFirst = false});

  final Stream<List<Booking>> stream;
  final bool Function(Booking)? filter;

  /// Sort by scheduled time, soonest first.
  final bool soonestFirst;

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<List<Booking>>(
      stream: stream,
      builder: (context, snapshot) {
        if (snapshot.hasError) return Center(child: Text(errorMessage(context, snapshot.error!)));
        final all = snapshot.data;
        if (all == null) return const Center(child: CircularProgressIndicator());
        final jobs = filter == null ? all.toList() : all.where(filter!).toList();
        if (soonestFirst) jobs.sort((a, b) => a.scheduledFor.compareTo(b.scheduledFor));
        if (jobs.isEmpty) return Center(child: Text(context.l10n.noJobs));
        return ListView.builder(
          padding: const EdgeInsets.all(12),
          itemCount: jobs.length,
          itemBuilder: (context, i) => JobCard(jobs[i]),
        );
      },
    );
  }
}
