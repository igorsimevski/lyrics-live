import assert from 'node:assert/strict';
import test from 'node:test';
import { fetchPage, lyricsText, pagePath, pathFromLink } from '../telegraph.mjs';

test('accepts only a public Telegraph page path or HTTPS link', () => {
  assert.equal(pathFromLink('https://telegra.ph/Lyrics-11-01'), 'Lyrics-11-01');
  assert.equal(pathFromLink('https://telegra.ph/%D0%9F%D0%B5%D1%81%D0%BD%D0%B0-11-01'), 'Песна-11-01');
  for (const value of ['', 'a'.repeat(257), '../createAccount', 'x/y', 'x?token=secret', 'x#y', 'x y', 'x%2fy']) {
    assert.throws(() => pagePath(value));
  }
  for (const value of ['http://telegra.ph/Lyrics', 'https://example.com/Lyrics', 'https://telegra.ph.evil.com/Lyrics',
    'https://secret@telegra.ph/Lyrics', 'https://telegra.ph/Lyrics?access_token=secret', 'https://telegra.ph/Lyrics#x', 'invalid']) {
    assert.throws(() => pathFromLink(value));
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
  const page = await fetchPage('Lyrics-11-01', async (url, options) => {
    assert.equal(url, 'https://api.telegra.ph/getPage/Lyrics-11-01?return_content=true');
    assert.equal(options.cache, 'no-store');
    assert.equal(options.credentials, 'omit');
    assert.equal(options.referrerPolicy, 'no-referrer');
    assert.ok(options.signal instanceof AbortSignal);
    return { ok: true, json: async () => ({ ok: true, result: { path: 'Lyrics-11-01', title: 'Песна', content: [{ tag: 'p', children: ['Строфа'] }] } }) };
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
