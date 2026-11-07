import assert from 'node:assert/strict';
import test from 'node:test';
import { fetchPage, FIXED_PAGE_PATH, lyricsText, pagePath } from '../telegraph.mjs';

test('accepts the fixed public Telegraph page path and rejects unsafe paths', () => {
  assert.equal(pagePath(FIXED_PAGE_PATH), 'YouTube-MP3-lyrics-11-01');
  assert.equal(pagePath('Песна-11-01'), 'Песна-11-01');
  for (const value of ['', 'a'.repeat(257), '../createAccount', 'x/y', 'x?token=secret', 'x#y', 'x y', 'x%2fy']) {
    assert.throws(() => pagePath(value));
  }
});

test('preserves Unicode, stanza spacing and literal HTML while ignoring embeds', () => {
  const paragraph = children => ({ tag: 'p', children });
  assert.equal(lyricsText([
    paragraph(['Прв стих', { tag: 'br' }, 'Втор стих']), paragraph(['\u00a0']),
    paragraph([{ tag: 'b', children: ['Трет стих'] }, ' <img src=x onerror=alert(1)>']),
    { tag: 'iframe', attrs: { src: 'https://example.com' }, children: ['ignored'] },
    { tag: 'script', children: ['ignored'] }, { tag: 'img' }, { tag: 'video' },
  ]), 'Прв стих\nВтор стих\n\nТрет стих <img src=x onerror=alert(1)>');
  assert.equal(lyricsText([]), '');
});

test('rejects malformed and oversized page content', () => {
  let deep = 'text';
  for (let depth = 0; depth < 25; depth++) deep = { tag: 'b', children: [deep] };
  for (const content of [null, [null], [false], [{ tag: 'p', children: 'invalid' }], ['a'.repeat(100_001)], Array(10_001).fill('a'), [deep]]) {
    assert.throws(() => lyricsText(content));
  }
});

test('reads only public data, bypasses caches, and returns plain lyrics', async () => {
  const page = await fetchPage(FIXED_PAGE_PATH, async (url, options) => {
    assert.equal(url, 'https://api.telegra.ph/getPage/YouTube-MP3-lyrics-11-01?return_content=true');
    assert.equal(options.cache, 'no-store');
    assert.equal(options.credentials, 'omit');
    assert.equal(options.referrerPolicy, 'no-referrer');
    assert.ok(options.signal instanceof AbortSignal);
    return { ok: true, json: async () => ({ ok: true, result: { path: FIXED_PAGE_PATH, title: 'Песна', content: [{ tag: 'p', children: ['Строфа'] }] } }) };
  });
  assert.deepEqual(page, { title: 'Песна', text: 'Строфа' });
});

test('service errors and unexpected page responses fail without rendering', async () => {
  const responses = [
    { ok: false },
    { ok: true, json: async () => ({ ok: false, error: 'PAGE_NOT_FOUND' }) },
    { ok: true, json: async () => ({ ok: true, result: { title: 'Song', path: 'other', content: [] } }) },
    { ok: true, json: async () => ({ ok: true, result: { title: 42, path: 'Lyrics-11-01', content: [] } }) },
    { ok: true, json: async () => { throw new SyntaxError('Invalid JSON'); } },
  ];
  for (const response of responses) await assert.rejects(fetchPage('Lyrics-11-01', async () => response));
});
