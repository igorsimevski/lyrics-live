const PIXELS_PER_SECOND = 12;
const MAXIMUM_FRAME_MILLISECONDS = 100;

export function createAutoscroll({ read, move, changed, schedule = requestAnimationFrame, cancel = cancelAnimationFrame }) {
  let isRunning = false;
  let frame;
  let previousTime;
  let position;

  function stop() {
    if (!isRunning) return;
    isRunning = false;
    cancel(frame);
    previousTime = undefined;
    changed(false);
  }

  function tick(time) {
    if (!isRunning) return;
    const state = read();
    if (!state.canScroll || position >= state.maximum) { stop(); return; }
    if (previousTime !== undefined) {
      const elapsed = Math.max(0, Math.min(time - previousTime, MAXIMUM_FRAME_MILLISECONDS));
      position += PIXELS_PER_SECOND * elapsed / 1000;
    }
    previousTime = time;
    position = Math.min(position, state.maximum);
    move(position);
    if (position >= state.maximum) stop(); else frame = schedule(tick);
  }

  function start() {
    const state = read();
    if (isRunning || !state.canScroll || state.position >= state.maximum) return;
    position = state.position;
    previousTime = undefined;
    isRunning = true;
    changed(true);
    frame = schedule(tick);
  }

  return { start, stop, toggle: () => isRunning ? stop() : start(), get isRunning() { return isRunning; } };
}
