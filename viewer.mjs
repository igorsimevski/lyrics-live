import { fetchPage, FIXED_PAGE_PATH } from './telegraph.mjs?v=2';
import { followPage } from './follower.mjs';

const element = id => document.getElementById(id);
const statusLabels = { connecting: 'Connecting…', live: 'Live · updates automatically', retry: 'Reconnecting…', paused: 'Paused' };
let stop;
let renderedSignature;

function status(state) {
  element('status').textContent = statusLabels[state];
  element('status').dataset.state = state;
  element('notice').hidden = state !== 'retry' && !(state === 'connecting' && renderedSignature === undefined);
  element('notice').textContent = state === 'connecting' ? 'Loading the published lyrics…'
    : 'Cannot check for new lyrics right now. Retrying automatically; the last lyrics stay on screen.';
}

function show(page) {
  const signature = JSON.stringify(page);
  if (signature === renderedSignature) return;
  renderedSignature = signature;
  element('lyrics').setAttribute('aria-busy', 'false');
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
  if (location.hash || location.search) history.replaceState(null, '', location.pathname);
  if (document.hidden) { status('paused'); return; }
  element('source').href = `https://telegra.ph/${FIXED_PAGE_PATH}`;
  stop = followPage({ load: () => fetchPage(FIXED_PAGE_PATH), show, status });
}

window.addEventListener('hashchange', start);
document.addEventListener('visibilitychange', start);
window.addEventListener('pagehide', () => stop?.());
window.addEventListener('pageshow', event => { if (event.persisted) start(); });
start();
