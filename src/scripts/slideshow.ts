/**
 * Reel runtime.
 *
 * Built for a machine nobody is watching: it scales itself to whatever display
 * it lands on, keeps the screen awake, hides the cursor, and never depends on
 * the network once the page has loaded. The control bar is there for when
 * somebody *is* watching and wants to hold a slide or skip ahead.
 */

const STAGE_W = 1920;
const STAGE_H = 1080;

/** Seconds per slide, cycled by the -/+ controls. */
const SPEEDS = [4, 6, 9, 12, 16, 22];

const params = new URLSearchParams(location.search);
const num = (key: string, fallback: number) => {
  const v = Number(params.get(key));
  return Number.isFinite(v) && v > 0 ? v : fallback;
};

let seconds = num('seconds', 9);
const FADE_MS = num('fade', 900);
const ONLY_STUDIOS = (params.get('studios') ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const SHOW_EVENTS = params.get('events') !== '0';

const stage = document.getElementById('stage');
const wrap = document.getElementById('stage-wrap');
if (!stage || !wrap) throw new Error('slideshow: stage missing');

const status = document.getElementById('status');
const controls = document.getElementById('controls');
const progress = document.getElementById('progress');
const counter = document.getElementById('counter');
const speedOut = document.getElementById('speed');

function applyTiming(): void {
  document.documentElement.style.setProperty('--fade-ms', `${FADE_MS}ms`);
  document.documentElement.style.setProperty('--dwell-ms', `${seconds * 1000 + FADE_MS}ms`);
  if (speedOut) speedOut.textContent = `${seconds}s`;
}
applyTiming();

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

if (slides.length === 0) {
  if (status) {
    status.textContent = 'No slides match this filter.';
    status.hidden = false;
  }
  if (controls) controls.hidden = true;
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

/** Restart the dwell bar from zero, or leave it frozen while paused. */
function resetProgress(): void {
  if (!progress) return;
  progress.classList.remove('run');
  void progress.offsetWidth; // reflow, so the animation actually replays
  if (!paused) progress.classList.add('run');
}

function show(i: number): void {
  index = ((i % slides.length) + slides.length) % slides.length;
  slides.forEach((s, n) => s.classList.toggle('is-active', n === index));
  warm(index);
  warm(index + 1);
  if (counter) counter.textContent = `${index + 1} / ${slides.length}`;
  resetProgress();
}

function schedule(): void {
  clearTimeout(timer);
  if (paused) return;
  timer = window.setTimeout(() => {
    show(index + 1);
    schedule();
  }, seconds * 1000);
}

function step(delta: number): void {
  show(index + delta);
  schedule();
}

function setPaused(next: boolean): void {
  paused = next;
  // Resuming restarts the full dwell rather than resuming a part-spent one, so
  // the slide you just unpaused on gets a proper look.
  if (progress) progress.classList.toggle('run', !paused);
  if (!paused) resetProgress();
  const btn = controls?.querySelector<HTMLButtonElement>('[data-act="play"]');
  if (btn) {
    btn.querySelector<SVGElement>('.i-pause')!.hidden = paused;
    btn.querySelector<SVGElement>('.i-play')!.hidden = !paused;
    btn.title = paused ? 'Play (space)' : 'Pause (space)';
    btn.setAttribute('aria-label', paused ? 'Play' : 'Pause');
  }
  schedule();
}

function nudgeSpeed(delta: number): void {
  const at = SPEEDS.indexOf(seconds);
  const next = at === -1 ? SPEEDS.findIndex((s) => s >= seconds) : at + delta;
  seconds = SPEEDS[Math.min(SPEEDS.length - 1, Math.max(0, next))] ?? seconds;
  applyTiming();
  resetProgress();
  schedule();
}

function toggleFullscreen(): void {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen().catch(() => {});
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

/* --------------------------------------------------------------- controls */

controls?.addEventListener('click', (e) => {
  const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
  if (!btn) return;
  switch (btn.dataset.act) {
    case 'prev': step(-1); break;
    case 'next': step(1); break;
    case 'play': setPaused(!paused); break;
    case 'slower': nudgeSpeed(1); break;
    case 'faster': nudgeSpeed(-1); break;
    case 'full': toggleFullscreen(); break;
  }
  reveal();
});

addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  switch (e.key) {
    case ' ':
      e.preventDefault();
      setPaused(!paused);
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
      toggleFullscreen();
      break;
    default:
      return;
  }
  reveal();
});

/* ------------------------------------------------------------- kiosk care */

/**
 * Cursor and control bar share one idle timer: move the mouse and both appear,
 * leave it alone and the screen goes back to being just the reel.
 */
let idle: number | undefined;
function reveal(): void {
  document.body.classList.remove('cursor-hidden');
  controls?.classList.add('is-shown');
  clearTimeout(idle);
  idle = window.setTimeout(() => {
    document.body.classList.add('cursor-hidden');
    controls?.classList.remove('is-shown');
  }, 2800);
}
reveal();
addEventListener('mousemove', reveal);
addEventListener('mousedown', reveal);

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
