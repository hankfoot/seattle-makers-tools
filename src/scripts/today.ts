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
 *
 * data/studios is safe to import here for the same reason: it is a list and a
 * lookup table with no data import behind it, so the studio map costs about a
 * kilobyte rather than the whole calendar.
 */
import type { SmEvent } from '../lib/events';
import { studiosForCategories, type Studio } from '../data/studios';
import {
  statuses,
  sessionEnd,
  clock,
  clockParts,
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

const board = document.getElementById('t-board');
const fullBtn = document.getElementById('t-full') as HTMLButtonElement | null;
const list = document.getElementById('t-list') as HTMLOListElement | null;
const empty = document.getElementById('t-empty');
const status = document.getElementById('t-status');
const dateEl = document.getElementById('t-date');
const clockEl = document.getElementById('t-clock');
const more = document.getElementById('t-more');
if (!board || !list || !empty || !status || !dateEl || !clockEl || !more) {
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
 * One source. /api/events scrapes the calendar on demand.
 *
 * There used to be a second: /events.json, the calendar baked in at build time.
 * It is gone, because it only refreshed when somebody ran `npm run events` and
 * nobody did - so the "fallback" was a schedule from weeks earlier presented as
 * today. A board that admits it cannot reach the calendar is worth more than
 * one confidently showing the wrong day.
 *
 * This does mean `astro dev` and `astro preview` have no source at all, since
 * the Worker runs under neither. Use `npm run serve`.
 */
const DEFAULTS = ['/api/events'];

/**
 * The clock the board reasons about.
 *
 * Normally the real one. `?debug=1` mounts a panel that can set it to any date
 * and time, which is the only practical way to see the live/next/past states -
 * they depend on the wall clock, so at 9pm every event is "finished" and there
 * is nothing to look at. The override is client-side and affects only what
 * this page *displays*; it never reaches the feed.
 */
let override: string | null = null;

/**
 * `?now=HH:MM` (optionally `?on=YYYY-MM-DD`) sets the clock from the URL, so a
 * particular state is a link rather than something you have to reproduce by
 * hand on a slider. Parsed strictly - a malformed value is ignored rather than
 * producing a board pinned to `NaN`.
 */
function overrideFromUrl(): string | null {
  const q = new URLSearchParams(location.search);
  const t = q.get('now');
  if (!t || !/^([01]\d|2[0-3]):[0-5]\d$/.test(t)) return null;
  const d = q.get('on');
  const day = d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : nowLocal().slice(0, 10);
  return `${day}T${t}`;
}

function now(): string {
  return override ?? nowLocal();
}

/** Local day as "YYYY-MM-DD", matching the feed's floating-local strings. */
function today(): string {
  return now().slice(0, 10);
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

/**
 * Which studio owns this event, from the calendar's own category slugs.
 *
 * Absent on purpose for the rows that genuinely belong to no room - tours,
 * new-member orientations, game night, the building being closed. Around a
 * third of the calendar carries no studio slug at all, and over half of that
 * is those whole-building events, so a blank here is usually correct rather
 * than a gap. Where it is a gap - a handful of titles the calendar simply has
 * not tagged - the fix belongs on the event, not in a lookup table here that
 * would make the board look right while the source stayed wrong.
 *
 * A few events carry two (leatherworking + sewing, cnc + woodshop). Both are
 * shown: which of the two rooms it is actually in is a question for the
 * organiser, and picking one silently would answer it wrongly some of the time.
 */
function studioLabel(studios: Studio[]): string {
  return studios.map((s) => s.name).join(' + ');
}

const CANCELLED = /\s*\(?\bcancell?ed\b\)?\s*/i;

/**
 * Where a thumbnail is allowed to come from.
 *
 * The feed is scraped from a page we do not control, so a URL out of it is
 * untrusted text exactly as the titles are - and an unchecked one would let
 * anything that reached the calendar put an arbitrary image on a screen in the
 * space. Same-origin paths are allowed because that is what the dummy fixture
 * uses; everything else has to be the calendar's own uploads.
 */
const THUMB_HOST = /^https:\/\/seattlemakers\.org\/wp-content\/uploads\//;

function thumbOf(e: SmEvent): string | null {
  const u = e.thumb;
  if (typeof u !== 'string' || !u) return null;
  if (u.startsWith('/')) return u.startsWith('//') ? null : u;
  return THUMB_HOST.test(u) ? u : null;
}

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

  // Two spans, not one string: the time is a block on the plate now, with the
  // hour set big and tabular and the meridiem small and tracked beneath the
  // eye. Built from clockParts() so the hero clock and the rail cannot drift.
  const t = el('span', 't-time');
  const parts = clockParts(e.start);
  t.append(el('span', 't-h', parts.hour), el('span', 't-mer', parts.meridiem));
  li.append(t);

  const body = el('div', 't-body');

  const studios = studiosForCategories(e.categories);

  const tags = el('p', 't-tags');
  const badge = BADGE[st];
  if (badge) tags.append(el('span', 't-badge', badge));
  tags.append(el('span', 't-kind', kindOf(e)));
  const studio = studioLabel(studios);
  if (studio) tags.append(el('span', 't-studio', studio));
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

  /**
   * The picture: the event's own where its page had one, else the studio's
   * icon on a tinted tile, else nothing.
   *
   * That chain is the reel's, for the reel's reason - a generic studio photo
   * in this frame reads as a picture *of the class*, which it is not, while an
   * icon reads as a label. Only about half the calendar's events carry a
   * usable picture, so without the icon tier the fallback would be doing most
   * of the work on a normal day.
   *
   * The last tier really is nothing. Whole-building events - tours,
   * orientations, meetups, game night - belong to no studio, and the only mark
   * that would fit is the wordmark, which on a Seattle Makers board says
   * something true of every row and therefore nothing about this one.
   *
   * An event in two studios takes the first. The pair it happens to is
   * leatherworking + sewing, and one icon beside both names is not a claim
   * about which room it is in - two tiles would be.
   *
   * Appended between the time and the body, which is where it sits on screen.
   * The CSS places it explicitly as well, and needs to: left to auto-placement
   * an item that names only a column is pushed to a *new grid row* whenever
   * the cursor has already passed that column, which put the picture under the
   * words and doubled the height of every row carrying one.
   */
  const photo = thumbOf(e);
  const icon = studios[0]?.icon ?? null;
  if (photo || icon) {
    // The picture is wrapped, and the wrapper is not decoration: the live row
    // pans its photograph, and an <img> cannot clip its own transform - scaled
    // in place it would simply bleed over the words beside it. `.t-shot` owns
    // the square and the clipping; the image inside is the only thing moving.
    const shot = el('div', 't-shot');
    const img = document.createElement('img');
    img.className = photo ? 't-thumb' : 't-thumb is-icon';
    img.src = photo ?? icon!;
    // Decorative: the title is the accessible name of this row and sits right
    // beside it, so announcing the picture as well would only repeat it.
    img.alt = '';
    // Eager, deliberately. Lazy looks like the obvious saving - fit() hides
    // rows rather than removing them, so their pictures would never be
    // fetched - but it hands the decision to the browser's idea of "near the
    // viewport", and this board lives in exactly the contexts that idea gets
    // wrong: element fullscreen, a backgrounded tab, an embedded frame. Left
    // lazy it loaded nothing at all in a preview pane, which on a wall is a
    // board of empty tiles with no way to tell why. A dozen 40K thumbnails
    // that all fit on one screen are not worth that.
    img.decoding = 'async';
    // A photo that fails falls down the same chain rather than leaving a torn
    // page on a screen that stays up for days - this is the one element whose
    // source is a third-party URL, and it can 404 long after the row was
    // drawn. The flag is what stops a failing icon from retrying forever.
    let fellBack = false;
    img.addEventListener('error', () => {
      if (!fellBack && photo && icon) {
        fellBack = true;
        img.className = 't-thumb is-icon';
        img.src = icon;
      } else {
        // The wrapper, not the image: left behind it is a tinted square with
        // nothing in it, which reads as a picture that failed rather than as a
        // row that never had one.
        shot.remove();
      }
    });
    shot.append(img);
    li.append(shot);
  }

  li.append(body);
  return li;
}

/**
 * The wall clock in the hero.
 *
 * Off now(), not off `new Date()`, so a board running under `?now=` shows the
 * hour it is pretending to be. Showing the real time beside a simulated
 * schedule is the one thing a clock on this board could get badly wrong - the
 * red bar says the day is made up, and a truthful clock would quietly argue
 * with it.
 *
 * Written only when the text actually changes. This runs once a second so the
 * minute never lands late - the board's own tick is 30s, which would show 2:14
 * for half a minute after it became 2:15 - and at that rate a blind write
 * would dirty the same node 86,400 times a day on a screen that is left up.
 */
function paintClock(): void {
  const next = clock(now());
  if (clockEl!.textContent !== next) clockEl!.textContent = next;
}

/** The events currently on screen, so tick() can re-stamp without refetching. */
let shown: SmEvent[] = [];

function render(events: SmEvent[], day: string): void {
  shown = events
    .filter((e) => typeof e.start === 'string' && e.start.slice(0, 10) === day)
    .sort((a, b) => a.start.localeCompare(b.start));

  const stamp = now();
  const marks = statuses(shown, stamp);
  list!.replaceChildren(...shown.map((e, i) => row(e, marks[i]!, stamp)));
  empty!.textContent = 'Nothing on the calendar today.';
  empty!.hidden = shown.length > 0;

  dateEl!.textContent = new Date(`${day}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  paintClock();
  fit();
  refreshDebug();
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
  paintClock();
  if (!shown.length) return;
  const stamp = now();
  const marks = statuses(shown, stamp);
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

    const note = statusNote(st, e.start, end, stamp);
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
      const pct = `${progress(e.start, end, stamp).toFixed(1)}%`;
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
  refreshDebug();
}

/* ------------------------------------------------------------------ debug */

/**
 * A panel for setting the clock, behind `?debug=1`.
 *
 * Every state this board can show depends on the wall clock, so most of them
 * are simply unreachable when you happen to be looking: at 9pm every event is
 * "finished" and there is nothing to see. Pointing the page at a chosen moment
 * is the only practical way to check that "on now", "up next" and the progress
 * bar behave - and to see the display layout at a busy hour rather than an
 * empty one.
 *
 * It is a debug tool and says so loudly. The board is a source of truth in the
 * space; one left on a wall showing a simulated time with no indication would
 * be worse than one that is merely stale.
 */
let debugEls: { date: HTMLInputElement; range: HTMLInputElement; read: HTMLElement; tally: HTMLElement } | null =
  null;

function debugOn(): boolean {
  return new URLSearchParams(location.search).get('debug') === '1';
}

const hhmm = (mins: number) =>
  `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;

function mountDebug(): void {
  if (!debugOn() || debugEls) return;

  const bar = el('div', 't-debug');
  bar.append(el('span', 't-debug-tag', 'Debug'));

  const date = document.createElement('input');
  date.type = 'date';
  date.className = 't-debug-date';
  date.value = now().slice(0, 10);

  const range = document.createElement('input');
  range.type = 'range';
  range.className = 't-debug-range';
  range.min = '0';
  range.max = '1439';
  range.step = '5';
  // Start where the board already is, which is the URL's time if it set one.
  const n = now();
  range.value = String(Number(n.slice(11, 13)) * 60 + Number(n.slice(14, 16)));

  const read = el('span', 't-debug-read');
  const tally = el('span', 't-debug-tally');

  const live = document.createElement('button');
  live.type = 'button';
  live.className = 't-debug-live';
  live.textContent = 'Back to live';

  const apply = () => {
    override = `${date.value}T${hhmm(Number(range.value))}`;
    markSimulated();
    void refresh();
  };
  date.addEventListener('input', apply);
  range.addEventListener('input', apply);
  live.addEventListener('click', () => {
    override = null;
    markSimulated();
    const t = nowLocal();
    date.value = t.slice(0, 10);
    range.value = String(Number(t.slice(11, 13)) * 60 + Number(t.slice(14, 16)));
    void refresh();
  });

  bar.append(date, range, read, tally, live);
  document.body.append(bar);
  debugEls = { date, range, read, tally };
  refreshDebug();
}

/** Keep the panel's readout in step with whatever the board just rendered. */
function refreshDebug(): void {
  if (!debugEls) return;
  const stamp = now();
  debugEls.read.textContent = clock(stamp);

  const counts: Record<string, number> = { live: 0, next: 0, later: 0, past: 0 };
  for (const r of [...list!.children] as HTMLLIElement[]) {
    const st = r.dataset.status;
    if (st && st in counts) counts[st]!++;
  }
  debugEls.tally.textContent = shown.length
    ? `${counts.live} live · ${counts.next} next · ${counts.later} later · ${counts.past} past`
    : 'no events that day';
}

/**
 * The red bar across the top whenever the clock is not the real one.
 *
 * Deliberately not part of refreshDebug(): that returns early when the panel
 * is not mounted, and `?now=` works without `?debug=1`. Tied to the panel, a
 * board opened with only `?now=` showed a simulated day with nothing saying so
 * - which is the one outcome this marker exists to prevent.
 */
function markSimulated(): void {
  document.documentElement.classList.toggle('t-simulated', override !== null);
}

/* ------------------------------------------------------------ display mode */

/**
 * Whether the browser is fullscreen - by either mechanism, because they are
 * two different things and neither one sees the other.
 *
 * `document.fullscreenElement` is only set when a page called
 * `requestFullscreen()`. Pressing F11 puts the *browser* in fullscreen and
 * leaves that property null - and F11 is the case this board actually meets,
 * since nothing on /today asks for fullscreen and the screen in the space is a
 * browser somebody put up. The CSS `(display-mode: fullscreen)` query is what
 * catches that one. Checking both means the detection survives either route,
 * including a future button here that calls the API.
 *
 * The media query is created once: a MediaQueryList only fires `change` while
 * a reference to it is alive, so one built inside the check would stop
 * listening the moment it went out of scope.
 */
const fullscreenQuery = window.matchMedia('(display-mode: fullscreen)');

function isFullscreen(): boolean {
  return document.fullscreenElement !== null || fullscreenQuery.matches;
}

/**
 * `?tv=1` forces the display layout on, `?tv=0` off. Then fullscreen. Then: a
 * large portrait viewport, which is a vertical TV and essentially nothing else.
 * The thresholds deliberately sit above a tablet in portrait (an iPad Pro 11"
 * is 834x1194) so a handheld device never silently becomes a wall board.
 *
 * Fullscreen is allowed to skip those thresholds because it is not a guess.
 * They exist to stop a *size* being mistaken for an intent, and there is
 * nothing accidental about F11 - putting this page up fullscreen is a request
 * for the board, not for a bigger web page. `?tv=0` still wins, so a fullscreen
 * window can be held in the windowed layout when someone is working on it.
 */
function wantsTv(): boolean {
  const q = new URLSearchParams(location.search).get('tv');
  if (q === '1') return true;
  if (q === '0') return false;
  if (isFullscreen()) return true;
  return window.matchMedia('(orientation: portrait) and (min-width: 700px) and (min-height: 1200px)')
    .matches;
}

/**
 * The miniature is the shape of the screen it is a miniature of.
 *
 * The board on the page has to have *some* aspect ratio, and picking one
 * blind - 16/9, say - makes it a preview of a screen nobody here owns: hang
 * the real board on a portrait TV and the row count, the wrap points and the
 * fit pass all come out different from what the window promised. `screen` is
 * the display this window is on, which is the display fullscreen will fill, so
 * it is the honest answer and it costs two numbers.
 *
 * Both forms are written because CSS needs them differently: `aspect-ratio`
 * wants a ratio, and the width cap has to multiply a height by a number.
 */
function setBoardShape(): void {
  const w = screen?.width || window.innerWidth;
  const h = screen?.height || window.innerHeight;
  if (!w || !h) return;
  board!.style.setProperty('--board-ar', `${w} / ${h}`);
  board!.style.setProperty('--board-arn', String(w / h));
}

/**
 * `t-full` is separate from `t-tv` even though fullscreen implies it: `?tv=1`
 * on a laptop is the display layout in a window, and only the F11 case is
 * really the browser being fullscreen. See the fullscreen block in today.astro.
 */
function applyMode(): void {
  const root = document.documentElement;
  root.classList.toggle('t-full', isFullscreen());
  root.classList.toggle('t-tv', wantsTv());
  setBoardShape();
  fit();
}

/**
 * Make the board fit itself exactly.
 *
 * A wall screen cannot be scrolled, so anything past the bottom edge is
 * invisible with no way to reveal it - worse than not being there, because the
 * board silently looks like the day ends early. This hides rows until the list
 * fits and says how many it dropped.
 *
 * It runs at both sizes, which is the point of the miniature: the board on the
 * page drops the same rows the wall screen drops, because it is the same board
 * measured the same way. It used to return early unless the display layout was
 * on, which made sense when the page was a scrolling list rather than a picture
 * of a screen.
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

/** "9/19 @ 10:00 pm" - one moment, date and time together. */
function moment(d: Date): string {
  const h = d.getHours();
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${d.getMonth() + 1}/${d.getDate()} @ ${h12}:${mm} ${h < 12 ? 'am' : 'pm'}`;
}

/**
 * When this data was last updated.
 *
 * One time now, not two. The stamp used to read "Last updated 27 aug · checked
 * 9:22 pm" because the two could be weeks apart: a five-minute poll kept
 * succeeding against a calendar baked in at build time, so "checked" was fresh
 * and the data was not. With the baked fallback gone, every success is a live
 * scrape and the two collapse into the same moment, which one timestamp says
 * honestly.
 *
 * **If a fallback is ever reintroduced, this has to go back to two parts.**
 * Reporting stale data under a fresh "last updated" is the exact failure that
 * structure existed to prevent, and this format cannot express the difference.
 */
function stamp(fetchedAt?: string, _live?: boolean): string {
  if (fetchedAt) {
    const f = new Date(fetchedAt);
    if (!Number.isNaN(f.getTime())) return `Last updated ${moment(f)}`;
  }
  // No fetchedAt: we do not know when the data changed, so we report only when
  // we looked, and do not call it an update.
  return `Checked ${moment(new Date())}`;
}

let lastDay = today();

async function refresh(): Promise<void> {
  const day = today();
  try {
    let data: { events?: SmEvent[]; fetchedAt?: string; live?: boolean } | null = null;
    for (const url of sources()) {
      try {
        // `day` asks the API to fetch descriptions for just this day's
        // events - a handful of pages rather than one per event in the
        // calendar. `t` is only a cache-buster.
        const sep = url.includes('?') ? '&' : '?';
        const res = await fetch(`${url}${sep}day=${day}&t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) continue;
        const body = await res.json();
        // `ok: false` is the Worker saying the scrape failed. Treat it as no
        // source rather than as a day with nothing on.
        if (body?.ok === false || !Array.isArray(body?.events)) continue;
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
    // Keep whatever is on screen - a board showing the last good day beats one
    // showing an error. But with no baked fallback there may be nothing on
    // screen at all, and an empty list must not be read as "nothing is on".
    if (!shown.length) {
      empty!.textContent = 'Cannot reach the calendar right now.';
      empty!.hidden = false;
      status!.textContent = 'Not connected';
    } else if (day !== lastDay) {
      status!.textContent = 'Offline - showing an older day';
    }
  }
}

/* ------------------------------------------------------------------- boot */

override = overrideFromUrl();
markSimulated();
mountDebug();
applyMode();
paintClock();
void refresh();

setInterval(() => void refresh(), POLL_MS);
setInterval(tick, TICK_MS);
// The clock is its own interval rather than a passenger on tick(): at 30s it
// would sit on the wrong minute for up to half of every one of them, which is
// visible next to any other clock in the building. paintClock() no-ops unless
// the text changed, so the other 29 calls cost a string compare.
setInterval(paintClock, 1000);

// A board left up for days should catch up the moment someone wakes the screen.
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) void refresh();
});

// Rotating a screen, or resizing a window, changes whether this is a display.
window.addEventListener('resize', applyMode);

/**
 * The button fullscreens *the board*, not the document.
 *
 * `document.documentElement.requestFullscreen()` would blow the whole page up
 * and rely on CSS to hide the parts that should not be there. Asking for the
 * element means the browser renders that element and nothing else, which is
 * the same picture arrived at honestly - and it is the one route that cannot
 * leave a stray bit of page chrome on a screen in the space.
 *
 * F11 still works and still lands somewhere sensible; that is what the t-tv
 * rules in today.astro are for.
 */
fullBtn?.addEventListener('click', () => {
  if (document.fullscreenElement) void document.exitFullscreen();
  else void board!.requestFullscreen().catch(() => {});
});

// The board changes size for reasons the window knows nothing about - entering
// element fullscreen, a --board-ar rewrite, the page reflowing around it - and
// every one of them changes how many rows fit. Watching the element itself
// catches all of them; watching the window catches some.
new ResizeObserver(() => fit()).observe(board);

// So does entering or leaving fullscreen, and both routes have to be watched.
// `fullscreenchange` fires only for the API; the media query fires for F11.
// Resize usually fires for both, but not dependably - going fullscreen on a
// screen the window already filled changes no dimension.
document.addEventListener('fullscreenchange', applyMode);
fullscreenQuery.addEventListener('change', applyMode);
