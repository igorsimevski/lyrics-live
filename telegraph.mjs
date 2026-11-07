const MAX_PATH_LENGTH = 256;
const MAX_NODES = 10_000;
const MAX_TEXT_LENGTH = 100_000;
const MAX_DEPTH = 20;
export const FIXED_PAGE_PATH = 'YouTube-MP3-lyrics-11-01';

export function pagePath(value) {
  if (!value || value.length > MAX_PATH_LENGTH || !/^[\p{L}\p{M}\p{N}_-]+$/u.test(value)) {
    throw new Error('Use a valid Telegraph page link.');
  }
  return value;
}

// Only text and line breaks reach the viewer. Remote HTML, links and embeds never become DOM.
export function lyricsText(nodes) {
  if (!Array.isArray(nodes)) throw new Error('The page has no lyrics content.');
  let count = 0;
  let length = 0;
  function text(node, depth) {
    if (++count > MAX_NODES || depth > MAX_DEPTH) throw new Error('The page is too large.');
    if (typeof node === 'string') {
      length += node.length;
      if (length > MAX_TEXT_LENGTH) throw new Error('The page is too large.');
      return node;
    }
    if (!node || typeof node !== 'object') throw new Error('The page has invalid content.');
    if (node.tag === 'br') return '\n';
    if (['script', 'style', 'iframe', 'img', 'video'].includes(node.tag)) return '';
    if (node.children != null && !Array.isArray(node.children)) throw new Error('The page has invalid content.');
    const value = (node.children ?? []).map(child => text(child, depth + 1)).join('');
    return ['p', 'pre', 'blockquote', 'h3', 'h4', 'li'].includes(node.tag) ? `${value}\n\n` : value;
  }
  return nodes.map(node => text(node, 0)).join('').replace(/\u00a0/g, ' ')
    .split(/\n[ \t]*\n+/).map(stanza => stanza.trim()).filter(Boolean).join('\n\n');
}

export async function fetchPage(path, fetcher = globalThis.fetch) {
  pagePath(path);
  const response = await fetcher(`https://api.telegra.ph/getPage/${encodeURIComponent(path)}?return_content=true`, {
    mode: 'cors', credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer',
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error('The publishing service is unavailable.');
  const data = await response.json();
  if (!data.ok || typeof data.result?.title !== 'string' || data.result.path !== path) {
    throw new Error('The published page is unavailable.');
  }
  return { title: data.result.title.slice(0, 256), text: lyricsText(data.result.content) };
}
