const POLL_MILLISECONDS = 3_000;
const MAXIMUM_RETRY_MILLISECONDS = 30_000;

// A new request starts only after the previous one finishes. A stopped request cannot update the view.
export function followPage({ load, show, status, schedule = setTimeout, cancel = clearTimeout }) {
  let isStopped = false;
  let timer;
  let previous;
  let retryMilliseconds = POLL_MILLISECONDS;
  async function poll() {
    try {
      const page = await load();
      if (isStopped) return;
      const signature = JSON.stringify(page);
      if (signature !== previous) {
        show(page);
        previous = signature;
      }
      status('live');
      retryMilliseconds = POLL_MILLISECONDS;
    } catch {
      if (isStopped) return;
      status('retry');
      retryMilliseconds = Math.min(retryMilliseconds * 2, MAXIMUM_RETRY_MILLISECONDS);
    }
    if (!isStopped) timer = schedule(poll, retryMilliseconds);
  }
  status('connecting');
  void poll();
  return () => { isStopped = true; cancel(timer); };
}
