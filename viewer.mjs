import { fetchPage, FIXED_PAGE_PATH } from './telegraph.mjs?v=2';
import { followPage } from './follower.mjs';
import { fitPage } from './fit-page.mjs?v=3';

const element = id => document.getElementById(id);
const statusLabels = { connecting: 'Connecting…', live: 'Live · updates automatically', retry: 'Reconnecting…', paused: 'Paused' };
let stop;
let renderedSignature;
let isScrolling = false;
let layoutFrame;
const mobile = window.matchMedia('(max-width: 640px), (hover: none) and (pointer: coarse)');

function layout() {
  const isPage = !isScrolling && !mobile.matches;
  document.body.dataset.view = isPage ? 'page' : 'scroll';
  const content = element('song-text');
  content.style.removeProperty('column-count');
  content.style.removeProperty('font-size');
  element('view-toggle').textContent = isPage ? 'Scrolling view' : 'Fit page';
  if (isPage) fitPage(content);
}

function scheduleLayout() {
  cancelAnimationFrame(layoutFrame);
  layoutFrame = requestAnimationFrame(layout);
}

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
  scheduleLayout();
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
element('view-toggle').addEventListener('click', () => {
  isScrolling = !isScrolling;
  scheduleLayout();
  window.scrollTo({ top: 0, behavior: 'instant' });
});
window.addEventListener('resize', scheduleLayout);
new ResizeObserver(scheduleLayout).observe(element('song-text'));
document.fonts.ready.then(scheduleLayout);
layout();
start();
