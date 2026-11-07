import { fetchPage, pagePath, pathFromLink } from './telegraph.mjs';
import { followPage } from './follower.mjs';

const element = id => document.getElementById(id);
const statusLabels = { connecting: 'Connecting…', live: 'Live · updates automatically', retry: 'Reconnecting…', paused: 'Paused' };
let stop;
let renderedSignature;
let currentPath;

function status(state) {
  element('status').textContent = statusLabels[state];
  element('status').dataset.state = state;
  element('notice').hidden = state !== 'retry' && !(state === 'connecting' && element('lyrics').hidden);
  element('notice').textContent = state === 'connecting' ? 'Loading the published lyrics…'
    : 'Cannot check for new lyrics right now. Retrying automatically; the last lyrics stay on screen.';
}

function show(page) {
  const signature = JSON.stringify(page);
  if (signature === renderedSignature) return;
  renderedSignature = signature;
  element('welcome').hidden = true;
  element('lyrics').hidden = false;
  element('song-title').textContent = page.title;
  document.title = `${page.title} · Lyrics Live`;
  const stanzas = page.text.split('\n\n').filter(Boolean).map(text => {
    const paragraph = document.createElement('p');
    paragraph.textContent = text;
    return paragraph;
  });
  element('song-text').replaceChildren(...stanzas);
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function start() {
  stop?.();
  if (!location.hash) {
    currentPath = undefined;
    renderedSignature = undefined;
    element('welcome').hidden = false;
    element('lyrics').hidden = true;
    element('notice').hidden = true;
    element('status').textContent = 'Ready';
    element('status').dataset.state = '';
    document.title = 'Lyrics Live';
    return;
  }
  if (document.hidden) { status('paused'); return; }
  try {
    const path = pagePath(decodeURIComponent(location.hash.slice(1)));
    if (currentPath !== path) {
      element('lyrics').hidden = true;
      renderedSignature = undefined;
      currentPath = path;
    }
    element('welcome').hidden = true;
    element('source').href = `https://telegra.ph/${encodeURIComponent(path)}`;
    element('form-error').textContent = '';
    stop = followPage({ load: () => fetchPage(path), show, status });
  } catch {
    currentPath = undefined;
    renderedSignature = undefined;
    element('welcome').hidden = false;
    element('lyrics').hidden = true;
    element('notice').hidden = true;
    element('status').textContent = 'Check the link';
    element('status').dataset.state = '';
    element('form-error').textContent = 'This link is invalid. Paste a Telegraph page link below.';
  }
}

element('page-form').addEventListener('submit', event => {
  event.preventDefault();
  try { location.hash = encodeURIComponent(pathFromLink(element('page-link').value.trim())); }
  catch { element('form-error').textContent = 'Paste a valid https://telegra.ph/ page link.'; }
});
window.addEventListener('hashchange', start);
document.addEventListener('visibilitychange', start);
window.addEventListener('pagehide', () => stop?.());
window.addEventListener('pageshow', event => { if (event.persisted) start(); });
start();
