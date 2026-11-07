import assert from 'node:assert/strict';
import test from 'node:test';
import { createAutoscroll } from '../autoscroll.mjs';

function fixture(initial = {}) {
  const state = { position: 0, maximum: 1000, canScroll: true, ...initial };
  const frames = new Map(), positions = [], changes = [];
  let nextId = 0;
  const scroll = createAutoscroll({
    read: () => ({ ...state }), move: position => { positions.push(position); state.position = Math.round(position); },
    changed: isRunning => changes.push(isRunning),
    schedule: callback => { frames.set(++nextId, callback); return nextId; }, cancel: id => frames.delete(id),
  });
  const tick = time => {
    const [id, callback] = frames.entries().next().value;
    frames.delete(id);
    callback(time);
  };
  return { scroll, state, frames, positions, changes, tick };
}

test('starts only on demand and advances slowly despite rounded browser positions', () => {
  const run = fixture();
  assert.equal(run.frames.size, 0);
  run.scroll.start();
  run.tick(0);
  for (let time = 10; time <= 1000; time += 10) run.tick(time);
  assert.ok(Math.abs(run.positions.at(-1) - 12) < 0.001);
  assert.deepEqual(run.changes, [true]);
  run.scroll.stop();
  assert.equal(run.frames.size, 0);
});

test('toggle stops immediately and restarting continues at the current position', () => {
  const run = fixture({ position: 300 });
  run.scroll.toggle();
  run.tick(0); run.tick(100);
  run.scroll.toggle();
  assert.equal(run.frames.size, 0);
  assert.equal(run.scroll.isRunning, false);
  run.state.position = 500;
  run.scroll.toggle();
  run.tick(9000); run.tick(9100);
  assert.ok(Math.abs(run.positions.at(-1) - 501.2) < 0.001);
  run.scroll.stop();
});

test('stops at the bottom without overshooting or leaving an animation pending', () => {
  const run = fixture({ position: 9, maximum: 10 });
  run.scroll.start();
  run.tick(0); run.tick(100);
  assert.equal(run.positions.at(-1), 10);
  assert.equal(run.scroll.isRunning, false);
  assert.equal(run.frames.size, 0);
  assert.deepEqual(run.changes, [true, false]);
});

test('does not start when unavailable or already at the bottom; duplicate starts do not overlap', () => {
  for (const initial of [{ canScroll: false }, { position: 1000 }, { maximum: 0 }]) {
    const run = fixture(initial);
    run.scroll.start();
    assert.equal(run.scroll.isRunning, false);
    assert.equal(run.frames.size, 0);
  }
  const run = fixture();
  run.scroll.start(); run.scroll.start();
  assert.equal(run.frames.size, 1);
  run.scroll.stop();
});

test('stops when scrolling view becomes unavailable and avoids jumps after a delayed frame', () => {
  const run = fixture();
  run.scroll.start();
  run.tick(0); run.tick(5000);
  assert.ok(Math.abs(run.positions.at(-1) - 1.2) < 0.001);
  run.state.canScroll = false;
  run.tick(5100);
  assert.equal(run.scroll.isRunning, false);
  assert.equal(run.frames.size, 0);
});
