// Stand-in for Next's `after()`: remembers the work to do after the response,
// so a test can run it with flushAfter() and check what was sent.
const queue: Array<() => unknown> = [];

export function queueAfter(task: () => unknown) {
  queue.push(task);
}

export async function flushAfter() {
  while (queue.length) await queue.shift()!();
}

export function clearAfter() {
  queue.length = 0;
}
