/**
 * Reel runtime.
 *
 * Built for a machine nobody is watching: it scales itself to whatever display
 * it lands on, keeps the screen awake, hides the cursor, and never depends on
 * the network once the page has loaded.
 */

const STAGE_W = 1920;
const STAGE_H = 1080;

const params = new URLSearchParams(location.search);
const num = (key: string, fallback: number) => {
  const v = Number(params.get(key));
  return Number.isFinite(v) && v > 0 ? v : fallback;
};

const SECONDS = num('seconds', 9);
const FADE_MS = num('fade', 900);
const ONLY_STUDIOS = (params.get('studios') ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const SHOW_EVENTS = params.get('events') !== '0';

const stage = document.getElementById('stage');
const wrap = document.getElementById('stage-wrap');
if (!stage || !wrap) throw new Error('slideshow: stage missing');

// Set before the first slide is shown, or slide one animates on the fallbacks.
document.documentElement.style.setProperty('--fade-ms', `${FADE_MS}ms`);
document.documentElement.style.setProperty('--dwell-ms', `${SECONDS * 1000 + FADE_MS}ms`);

/* ---------------------------------------------------------------- scaling */

/**
 * The deck is authored at a real 1920x1080 so every size in the components is
 * the same number a designer would use in the source file. Fitting it to the
 * display is one transform rather than a page full of viewport maths.
 */
function fit() {
  const scale = Math.min(wrap!.clientWidth / STAGE_W, wrap!.clientHeight / STAGE_H);
  stage!.style.transform = `translate(-50%, -50%) scale(${scale})`;
}
fit();
addEventListener('resize', fit);
new ResizeObserver(fit).observe(wrap);

/* ------------------------------------------------------------ slide setup */

const pad = (n: number) => String(n).padStart(2, '0');
function localNow(d = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Resolve each event card to its soonest occurrence that has not happened yet.
 * The page is static, so without this a build from last week would cheerfully
 * advertise a class that already ran. Cards with nothing left drop out.
 */
function resolveEventCards(now: string): void {
  for (const slide of stage!.querySelectorAll<HTMLElement>('[data-type="event"]')) {
    const options = [...slide.querySelectorAll<HTMLElement>('.event-option')];
    let chosen: HTMLElement | null = null;
    for (const o of options) {
      const start = o.dataset.start ?? '';
      if (!chosen && start >= now) chosen = o;
      o.hidden = true;
    }
    if (chosen) chosen.hidden = false;
    else slide.dataset.skip = 'true';
  }
}
resolveEventCards(localNow());

function collect(): HTMLElement[] {
  return [...stage!.querySelectorAll<HTMLElement>('.slide')].filter((s) => {
    if (s.dataset.skip === 'true') return false;
    if (!SHOW_EVENTS && s.dataset.type === 'event') return false;
    if (ONLY_STUDIOS.length) {
      const studio = s.dataset.studio;
      // Brand cards always survive a studio filter - they are the reel's spine.
      if (s.dataset.type !== 'brand' && (!studio || !ONLY_STUDIOS.includes(studio))) return false;
    }
    return true;
  });
}

const slides = collect();
const live = new Set(slides);
for (const s of stage.querySelectorAll<HTMLElement>('.slide')) {
  if (!live.has(s)) s.classList.add('is-out');
}

const status = document.getElementById('status');
if (slides.length === 0) {
  if (status) {
    status.textContent = 'No slides match this filter.';
    status.hidden = false;
  }
  throw new Error('slideshow: no slides');
}

/* --------------------------------------------------------------- playback */

let index = 0;
let paused = false;
let timer: number | undefined;

/**
 * Force a slide's images to load now.
 *
 * The markup marks them lazy so opening the page is cheap, but a lazy image
 * inside a slide sitting at opacity 0 may never load on its own - which shows
 * up as a slide that fades in with a hole where the photo should be. Warming
 * them explicitly is what makes the loop reliable.
 */
function warm(i: number): void {
  const slide = slides[((i % slides.length) + slides.length) % slides.length];
  if (!slide) return;
  for (const img of slide.querySelectorAll<HTMLImageElement>('img')) {
    if (img.complete && img.naturalWidth > 0) continue;
    img.loading = 'eager';
    const pre = new Image();
    pre.src = img.currentSrc || img.src;
  }
}

function show(i: number): void {
  index = ((i % slides.length) + slides.length) % slides.length;
  slides.forEach((s, n) => s.classList.toggle('is-active', n === index));
  warm(index);
  warm(index + 1);
}

function schedule(): void {
  clearTimeout(timer);
  if (paused) return;
  timer = window.setTimeout(() => {
    show(index + 1);
    schedule();
  }, SECONDS * 1000);
}

function step(delta: number): void {
  show(index + delta);
  schedule();
}

show(0);
schedule();

/**
 * Every slide will be on screen within one loop anyway, so pull the whole reel
 * into cache in the background, gently, once the first slides are up. After
 * this the show is entirely local and a dropped network changes nothing.
 */
{
  let i = 0;
  const warmRest = () => {
    if (i >= slides.length) return;
    warm(i++);
    setTimeout(warmRest, 120);
  };
  setTimeout(warmRest, 1500);
}

/* ------------------------------------------------------------- kiosk care */

/** Keep the display awake; the lock is dropped whenever the tab is hidden. */
let lock: WakeLockSentinel | null = null;
async function keepAwake(): Promise<void> {
  if (!('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
  try {
    lock = await navigator.wakeLock.request('screen');
    lock.addEventListener('release', () => (lock = null));
  } catch {
    /* Denied or unsupported - the reel still runs, the screen may just sleep. */
  }
}
keepAwake();
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    keepAwake();
    // A machine that slept through several slides should not resume mid-fade.
    show(index);
    schedule();
  }
});

let idle: number | undefined;
function nudgeCursor(): void {
  document.body.classList.remove('cursor-hidden');
  clearTimeout(idle);
  idle = window.setTimeout(() => document.body.classList.add('cursor-hidden'), 2500);
}
nudgeCursor();
addEventListener('mousemove', nudgeCursor);

addEventListener('keydown', (e) => {
  switch (e.key) {
    case ' ':
      e.preventDefault();
      paused = !paused;
      if (status) {
        status.textContent = paused ? 'paused' : '';
        status.hidden = !paused;
      }
      schedule();
      break;
    case 'ArrowRight':
      e.preventDefault();
      step(1);
      break;
    case 'ArrowLeft':
      e.preventDefault();
      step(-1);
      break;
    case 'f':
    case 'F':
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen().catch(() => {});
      break;
  }
});
