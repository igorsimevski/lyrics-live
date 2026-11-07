import { fetchPage, FIXED_PAGE_PATH } from './telegraph.mjs?v=2';
import { followPage } from './follower.mjs';
import { fitPage } from './fit-page.mjs?v=3';
import { createAutoscroll } from './autoscroll.mjs?v=4';

const element = id => document.getElementById(id);
const statusLabels = { connecting: 'Connecting…', live: 'Live · updates automatically', retry: 'Reconnecting…', paused: 'Paused' };
let stop;
let renderedSignature;
let isScrolling = false;
let layoutFrame;
const mobile = window.matchMedia('(max-width: 640px), (hover: none) and (pointer: coarse)');
const autoscroll = createAutoscroll({
  read: () => ({ position: window.scrollY, maximum: maximumScroll(),
    canScroll: document.body.dataset.view === 'scroll' && !document.hidden && renderedSignature !== undefined }),
  move: top => window.scrollTo({ top, behavior: 'instant' }),
  changed: () => syncAutoscroll(),
});

function maximumScroll() {
  return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
}

function syncAutoscroll() {
  const button = element('autoscroll-toggle');
  button.hidden = document.body.dataset.view !== 'scroll';
  button.textContent = autoscroll.isRunning ? 'Stop autoscroll' : 'Autoscroll';
  button.setAttribute('aria-pressed', String(autoscroll.isRunning));
  button.disabled = !autoscroll.isRunning && (renderedSignature === undefined || window.scrollY >= maximumScroll() - 0.5);
}

function layout() {
  const isPage = !isScrolling && !mobile.matches;
  document.body.dataset.view = isPage ? 'page' : 'scroll';
  const content = element('song-text');
  content.style.removeProperty('column-count');
  content.style.removeProperty('font-size');
  element('view-toggle').textContent = isPage ? 'Scrolling view' : 'Fit page';
  if (isPage) { autoscroll.stop(); fitPage(content); }
  syncAutoscroll();
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
  autoscroll.stop();
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
  if (document.hidden) { autoscroll.stop(); status('paused'); return; }
  element('source').href = `https://telegra.ph/${FIXED_PAGE_PATH}`;
  stop = followPage({ load: () => fetchPage(FIXED_PAGE_PATH), show, status });
}

window.addEventListener('hashchange', start);
document.addEventListener('visibilitychange', start);
window.addEventListener('pagehide', () => { stop?.(); autoscroll.stop(); });
window.addEventListener('pageshow', event => { if (event.persisted) start(); });
element('view-toggle').addEventListener('click', () => {
  autoscroll.stop();
  isScrolling = !isScrolling;
  scheduleLayout();
  window.scrollTo({ top: 0, behavior: 'instant' });
});
element('autoscroll-toggle').addEventListener('click', () => autoscroll.toggle());
for (const eventName of ['wheel', 'touchstart', 'pointerdown']) {
  window.addEventListener(eventName, event => {
    if (eventName === 'wheel' || !event.target.closest?.('#autoscroll-toggle')) autoscroll.stop();
  }, { passive: true });
}
window.addEventListener('keydown', event => {
  const isButtonActivation = event.key === ' ' && event.target.closest?.('#autoscroll-toggle');
  if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)
    && !isButtonActivation) autoscroll.stop();
});
window.addEventListener('scroll', syncAutoscroll, { passive: true });
window.addEventListener('resize', scheduleLayout);
new ResizeObserver(scheduleLayout).observe(element('song-text'));
document.fonts.ready.then(scheduleLayout);
layout();
start();
