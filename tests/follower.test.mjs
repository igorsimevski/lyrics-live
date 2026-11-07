import assert from 'node:assert/strict';
import test from 'node:test';
import { followPage } from '../follower.mjs';

function fixture(load) {
  const pages = [], states = [], tasks = [];
  const stop = followPage({ load, show: page => pages.push(page), status: state => states.push(state),
    schedule: (run, delay) => { const task = { run, delay }; tasks.push(task); return task; },
    cancel: task => { if (task) task.isCancelled = true; },
  });
  return { pages, states, tasks, stop };
}

test('updates a second publication automatically without redrawing unchanged lyrics', async () => {
  let page = { title: 'First', text: 'First lyrics' };
  const run = fixture(async () => ({ ...page }));
  await Promise.resolve();
  assert.deepEqual(run.pages, [page]);
  assert.equal(run.tasks[0].delay, 3_000);
  await run.tasks[0].run();
  assert.equal(run.pages.length, 1);
  page = { title: 'Second', text: 'Нови стихови' };
  await run.tasks[1].run();
  assert.deepEqual(run.pages[1], page);
  assert.deepEqual(run.states, ['connecting', 'live', 'live', 'live']);
  run.stop();
  assert.equal(run.tasks[2].isCancelled, true);
});

test('retains the last lyrics on error, retries with a bounded delay, and recovers', async () => {
  let hasFailed = false;
  const page = { title: 'Song', text: 'Lyrics' };
  const run = fixture(async () => { if (hasFailed) throw new Error('offline'); return page; });
  await Promise.resolve();
  hasFailed = true;
  for (let index = 0; index < 5; index++) await run.tasks[index].run();
  assert.deepEqual(run.pages, [page]);
  assert.deepEqual(run.tasks.map(task => task.delay), [3_000, 6_000, 12_000, 24_000, 30_000, 30_000]);
  hasFailed = false;
  await run.tasks[5].run();
  assert.equal(run.states.at(-1), 'live');
  assert.equal(run.tasks.at(-1).delay, 3_000);
  run.stop();
});

test('does not overlap requests or render a stale response after stopping', async () => {
  let resolve;
  const run = fixture(() => new Promise(done => { resolve = done; }));
  assert.equal(run.tasks.length, 0);
  run.stop();
  resolve({ title: 'Old song', text: 'Old lyrics' });
  await Promise.resolve();
  assert.deepEqual(run.pages, []);
  assert.deepEqual(run.states, ['connecting']);
  assert.equal(run.tasks.length, 0);
});

test('stopping an in-flight failed request prevents retries', async () => {
  let reject;
  const run = fixture(() => new Promise((resolve, fail) => { reject = fail; }));
  run.stop();
  reject(new Error('offline'));
  await Promise.resolve();
  assert.deepEqual(run.states, ['connecting']);
  assert.equal(run.tasks.length, 0);
});
