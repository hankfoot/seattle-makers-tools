/**
 * Live refresh, live clock, and the fit, for /today.
 *
 * The page is already correct when this loads - Astro rendered today's events
 * at build time. Three things happen on top of that, and they are separate on
 * purpose:
 *
 *   refresh()  every 5 minutes, and on visibilitychange. Replaces *what* is on.
 *              Every failure path is a no-op: a screen in the space showing
 *              yesterday's board beats one showing an error.
 *   tick()     every 30 seconds, no network. Re-stamps *where the day stands* -
 *              past / live / next / later - so the board walks through the day
 *              on its own. This is what makes it a live view rather than a list
 *              that happens to reload.
 *   fit()      after either, in display mode only. Hides whatever will not fit
 *              the viewport, because a wall screen cannot be scrolled.
 *
 * Only the *type* comes from lib/events - importing the module would pull
 * events.json, 72K, into this bundle, which is exactly what the fetch exists to
 * avoid. The status rules live in lib/day-status, which imports no data, so
 * this file and today.astro share one implementation instead of keeping two
 * copies of the same rules in step by hand.
 */
import type { SmEvent } from '../lib/events';
import {
  statuses,
  sessionEnd,
  clock,
  progress,
  statusNote,
  nowLocal,
  type Status,
} from '../lib/day-status';

/** How often to refetch. Classes move on a scale of hours, not seconds. */
const POLL_MS = 5 * 60 * 1000;
/** How often to re-evaluate the clock. Fine enough that "starts in 3m" is not
    a lie, coarse enough to be free. */
const TICK_MS = 30 * 1000;

const list = document.getElementById('t-list') as HTMLOListElement | null;
const empty = document.getElementById('t-empty');
const status = document.getElementById('t-status');
const dateEl = document.getElementById('t-date');
const more = document.getElementById('t-more');
if (!list || !empty || !status || !dateEl || !more) {
  throw new Error('today: missing mount points');
}

/**
 * `?src=` points the board at another feed - that is how the dummy calendar is
 * tested (`/today?src=/events-dummy.json`). Same-origin paths only: an absolute
 * URL would both fail CORS and turn a shared link into a way to put arbitrary
 * text on a screen in the space.
 */
function sources(): string[] {
  const raw = new URLSearchParams(location.search).get('src');
  if (raw) return raw.startsWith('/') && !raw.startsWith('//') ? [raw] : DEFAULTS;
  return DEFAULTS;
}

/**
 * Live first, baked second.
 *
 * /api/events scrapes the calendar on demand and is the only thing here that
 * is actually live. It does not exist during `astro dev` or on a host without
 * functions, so /events.json - the calendar baked in at build time - is the
 * fallback, and the board degrades to build-fresh instead of breaking.
 */
const DEFAULTS = ['/api/events', '/events.json'];

/** Local day as "YYYY-MM-DD", matching the feed's floating-local strings. */
function today(): string {
  return nowLocal().slice(0, 10);
}

const KINDS: Record<string, string> = {
  class: 'class',
  certification: 'certification',
  meetup: 'meetup',
  'guided-studio': 'open studio',
  tour: 'tour',
  orientation: 'orientation',
};

function kindOf(e: SmEvent): string {
  for (const k of e.kinds) if (KINDS[k]) return KINDS[k];
  return 'event';
}

const CANCELLED = /\s*\(?\bcancell?ed\b\)?\s*/i;
const BADGE: Partial<Record<Status, string>> = { live: 'On now', next: 'Up next' };

function el(tag: string, cls: string, text?: string): HTMLElement {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  // textContent, never innerHTML: titles and summaries come from a scraped
  // page, so they are untrusted text and must never be parsed as markup.
  if (text !== undefined) n.textContent = text;
  return n;
}

/**
 * One row of the time rail.
 *
 * This has to come out identical to the build-time render in today.astro -
 * same elements, same class names, same data-status - or the board visibly
 * restyles itself the moment the first fetch lands. The classes are plain
 * names defined once, in that page's `is:global` block.
 */
function row(e: SmEvent, st: Status, now: string): HTMLLIElement {
  const cancelled = CANCELLED.test(e.title);
  const li = el('li', cancelled ? 't-row is-off' : 't-row') as HTMLLIElement;
  li.dataset.status = st;

  li.append(el('span', 't-time', clock(e.start)));

  const body = el('div', 't-body');

  const tags = el('p', 't-tags');
  const badge = BADGE[st];
  if (badge) tags.append(el('span', 't-badge', badge));
  tags.append(el('span', 't-kind', kindOf(e)));
  if (cancelled) {
    tags.append(el('span', 't-flag is-off', 'cancelled'));
  } else if (e.soldOut) {
    tags.append(el('span', 't-flag is-mute', 'full'));
  } else if (typeof e.available === 'number' && e.available > 0 && e.available <= 5) {
    tags.append(el('span', 't-flag is-go', `${e.available} left`));
  }
  body.append(tags);

  body.append(el('h2', 't-title', e.title.replace(CANCELLED, ' ').trim()));
  if (e.summary) body.append(el('p', 't-sum', e.summary));

  const end = sessionEnd(e.start, e.end);
  const note = statusNote(st, e.start, end, now);
  if (note) body.append(el('p', 't-note', note));

  if (st === 'live') {
    const bar = el('div', 't-progress');
    bar.setAttribute('role', 'presentation');
    const fill = el('i', '');
    fill.style.width = `${progress(e.start, end, now).toFixed(1)}%`;
    bar.append(fill);
    body.append(bar);
  }

  li.append(body);
  return li;
}

/** The events currently on screen, so tick() can re-stamp without refetching. */
let shown: SmEvent[] = [];

function render(events: SmEvent[], day: string): void {
  shown = events
    .filter((e) => typeof e.start === 'string' && e.start.slice(0, 10) === day)
    .sort((a, b) => a.start.localeCompare(b.start));

  const now = nowLocal();
  const marks = statuses(shown, now);
  list!.replaceChildren(...shown.map((e, i) => row(e, marks[i]!, now)));
  empty!.hidden = shown.length > 0;

  dateEl!.textContent = new Date(`${day}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  fit();
}

/**
 * Re-stamp the statuses against the clock, without touching the network or
 * rebuilding the DOM.
 *
 * Rebuilding would be simpler and is wrong: it would throw away the progress
 * bar's CSS transition every 30 seconds, and it would fight any text the
 * browser has selected. Only what changed gets written.
 */
function tick(): void {
  if (!shown.length) return;
  const now = nowLocal();
  const marks = statuses(shown, now);
  const rows = [...list!.children] as HTMLLIElement[];

  shown.forEach((e, i) => {
    const li = rows[i];
    if (!li) return;
    const st = marks[i]!;
    const end = sessionEnd(e.start, e.end);

    if (li.dataset.status !== st) {
      li.dataset.status = st;
      // The badge is the only element whose existence depends on status.
      const tags = li.querySelector('.t-tags');
      const existing = tags?.querySelector('.t-badge');
      const wanted = BADGE[st];
      if (existing && !wanted) existing.remove();
      else if (!existing && wanted) tags?.prepend(el('span', 't-badge', wanted));
      else if (existing && wanted) existing.textContent = wanted;
    }

    const note = statusNote(st, e.start, end, now);
    let noteEl = li.querySelector('.t-note');
    if (note && !noteEl) {
      noteEl = el('p', 't-note', note);
      li.querySelector('.t-body')?.append(noteEl);
    } else if (note && noteEl) {
      noteEl.textContent = note;
    } else if (!note && noteEl) {
      noteEl.remove();
    }

    const bar = li.querySelector('.t-progress');
    if (st === 'live') {
      const pct = `${progress(e.start, end, now).toFixed(1)}%`;
      if (bar) {
        (bar.firstElementChild as HTMLElement).style.width = pct;
      } else {
        const made = el('div', 't-progress');
        made.setAttribute('role', 'presentation');
        const fill = el('i', '');
        fill.style.width = pct;
        made.append(fill);
        li.querySelector('.t-body')?.append(made);
      }
    } else if (bar) {
      bar.remove();
    }
  });

  fit();
}

/* ------------------------------------------------------------ display mode */

/**
 * `?tv=1` forces the display layout on, `?tv=0` off. Otherwise: a large
 * portrait viewport, which is a vertical TV and essentially nothing else. The
 * thresholds deliberately sit above a tablet in portrait (an iPad Pro 11" is
 * 834x1194) so a handheld device never silently becomes a wall board.
 */
function wantsTv(): boolean {
  const q = new URLSearchParams(location.search).get('tv');
  if (q === '1') return true;
  if (q === '0') return false;
  return window.matchMedia('(orientation: portrait) and (min-width: 700px) and (min-height: 1200px)')
    .matches;
}

function applyMode(): void {
  document.documentElement.classList.toggle('t-tv', wantsTv());
  fit();
}

/**
 * Make the board fit one viewport exactly.
 *
 * A wall screen cannot be scrolled, so anything past the bottom edge is
 * invisible with no way to reveal it - worse than not being there, because the
 * board silently looks like the day ends early. This hides rows until the list
 * fits and says how many it dropped.
 *
 * What gets sacrificed, in order: finished events from the top of the day, then
 * the latest events from the bottom. Never the live row or the next one - those
 * are the two facts the board exists to show, and a fit that can hide them has
 * missed the point. Rows are hidden rather than removed so the next pass can
 * bring them back without a re-render.
 */
function fit(): void {
  const rows = [...list!.children] as HTMLLIElement[];
  for (const r of rows) r.hidden = false;
  more!.hidden = true;

  if (!document.documentElement.classList.contains('t-tv')) return;

  const overflows = () => list!.scrollHeight > list!.clientHeight + 1;
  if (!overflows()) return;

  const sacrificial = (r: HTMLLIElement) =>
    r.dataset.status !== 'live' && r.dataset.status !== 'next';

  // Finished events first, oldest first - they are the least useful thing on
  // a board about what is happening.
  const past = rows.filter((r) => r.dataset.status === 'past');
  // Then the far end of the day, latest first.
  const tail = rows.filter((r) => r.dataset.status === 'later').reverse();

  let droppedPast = 0;
  let droppedLater = 0;
  for (const r of past) {
    if (!overflows()) break;
    r.hidden = true;
    droppedPast++;
  }
  for (const r of tail) {
    if (!overflows()) break;
    if (!sacrificial(r)) continue;
    r.hidden = true;
    droppedLater++;
  }

  const parts: string[] = [];
  if (droppedPast) parts.push(`${droppedPast} earlier`);
  if (droppedLater) parts.push(`${droppedLater} later`);
  if (parts.length) {
    more!.textContent = `+ ${parts.join(' · ')} not shown`;
    more!.hidden = false;
    // The line itself takes room; if that tips it over, give back one row.
    if (overflows()) {
      const lastHidden = [...rows].reverse().find((r) => r.hidden);
      if (lastHidden && !overflows()) lastHidden.hidden = false;
    }
  }
}

/* ------------------------------------------------------------------ fetch */

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/**
 * Two different times, and conflating them is how a board quietly lies.
 * `checked` is when we last re-read the feed; the calendar date is how old the
 * data in it actually is. Those are only the same once something keeps
 * /events.json fresh - today it is baked at build time, so a poll succeeding
 * every five minutes against a three-week-old file would otherwise read as
 * "updated 2:40 pm" and nobody would think to doubt the board.
 */
function stamp(fetchedAt?: string, live?: boolean): string {
  const n = new Date();
  const checked = clock(nowLocal(n));
  // `live` is set only by /api/events, and only when it really did just scrape
  // the calendar. The static fallback has no such field, so it can never
  // accidentally claim to be live.
  if (live) return `live · checked ${checked}`;
  if (!fetchedAt) return `checked ${checked}`;
  const f = new Date(fetchedAt);
  if (Number.isNaN(f.getTime())) return `checked ${checked}`;
  return `calendar ${f.getDate()} ${MONTHS[f.getMonth()]} · checked ${checked}`;
}

let lastDay = today();

async function refresh(): Promise<void> {
  const day = today();
  try {
    let data: { events?: SmEvent[]; fetchedAt?: string; live?: boolean } | null = null;
    for (const url of sources()) {
      try {
        const res = await fetch(`${url}?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) continue;
        const body = await res.json();
        if (!Array.isArray(body?.events)) continue;
        data = body;
        break;
      } catch {
        // Try the next source. Only an empty list at the end is a failure.
      }
    }
    if (!data) throw new Error('no source');

    render(data.events!, day);
    lastDay = day;
    status!.textContent = stamp(data.fetchedAt, data.live);
  } catch {
    // Keep whatever is on screen. Only say so if the day has rolled over,
    // because that is the one case where the board is now actually wrong.
    if (day !== lastDay) status!.textContent = 'offline - showing an older day';
  }
}

/* ------------------------------------------------------------------- boot */

applyMode();
void refresh();

setInterval(() => void refresh(), POLL_MS);
setInterval(tick, TICK_MS);

// A board left up for days should catch up the moment someone wakes the screen.
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) void refresh();
});

// Rotating a screen, or resizing a window, changes whether this is a display.
window.addEventListener('resize', applyMode);
