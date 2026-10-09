import 'package:flutter/material.dart';
import 'package:tolely/core/theme/brand.dart';
import 'package:tolely/core/widgets/feedback.dart';
import 'package:tolely/features/booking/domain/booking.dart';
import 'package:tolely/features/supplier/presentation/job_card.dart';

/// A section of the job list: a heading and its jobs.
typedef JobSection = ({String? title, List<Booking> jobs});

/// A live list of jobs from [stream]: [sections] splits them into headed groups, [header] goes on top
/// (e.g. the Online card), and [empty] is shown when there are no jobs.
class JobList extends StatelessWidget {
  const JobList({super.key, required this.stream, required this.sections, required this.empty, this.header});

  final Stream<List<Booking>> stream;
  final List<JobSection> Function(List<Booking> jobs) sections;
  final Widget empty;
  final Widget? header;

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<List<Booking>>(
      stream: stream,
      builder: (context, snapshot) {
        final all = snapshot.data;
        final groups = all == null ? const <JobSection>[] : sections(all).where((g) => g.jobs.isNotEmpty).toList();
        final children = <Widget>[
          for (final g in groups) ...[
            if (g.title != null)
              Padding(
                padding: const EdgeInsets.fromLTRB(4, 16, 4, 8),
                child: Text(
                  g.title!,
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(color: Brand.muted, fontWeight: FontWeight.w700),
                ),
              ),
            for (final job in g.jobs) JobCard(job),
          ],
        ];
        return CustomScrollView(
          slivers: [
            if (header != null)
              SliverPadding(padding: const EdgeInsets.fromLTRB(16, 12, 16, 0), sliver: SliverToBoxAdapter(child: header)),
            if (snapshot.hasError)
              SliverFillRemaining(hasScrollBody: false, child: Center(child: Text(errorMessage(context, snapshot.error!))))
            else if (all == null)
              const SliverFillRemaining(hasScrollBody: false, child: Center(child: CircularProgressIndicator()))
            else if (groups.isEmpty)
              // Nothing to list: the message sits in the middle of the free space.
              SliverFillRemaining(hasScrollBody: false, child: Center(child: empty))
            else
              SliverPadding(padding: const EdgeInsets.fromLTRB(16, 0, 16, 24), sliver: SliverList.list(children: children)),
          ],
        );
      },
    );
  }
}

/// A friendly "nothing here" message with an icon.
class EmptyJobs extends StatelessWidget {
  const EmptyJobs({super.key, required this.icon, required this.title, required this.hint});

  final IconData icon;
  final String title;
  final String hint;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 72,
            height: 72,
            decoration: BoxDecoration(color: Brand.blue.withValues(alpha: 0.08), shape: BoxShape.circle),
            child: Icon(icon, size: 34, color: Brand.blue),
          ),
          const SizedBox(height: 16),
          Text(title, style: text.titleMedium?.copyWith(fontWeight: FontWeight.w700), textAlign: TextAlign.center),
          const SizedBox(height: 4),
          Text(hint, style: text.bodyMedium?.copyWith(color: Brand.muted), textAlign: TextAlign.center),
        ],
      ),
    );
  }
}
