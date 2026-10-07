// Runs async tasks strictly one after another, in call order.
// The log endpoints are full-document upserts (last write wins), so overlapping requests
// that arrive out of order could overwrite newer state with older state.
export function createSerialQueue() {
  let tail: Promise<unknown> = Promise.resolve();
  return function enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = tail.then(task, task);
    tail = run.catch(() => undefined);
    return run;
  };
}
