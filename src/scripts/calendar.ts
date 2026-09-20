/**
 * The studio calendar: fetch, filter, lay out, scale, print.
 *
 * The calendar is fetched **once**, whole, and every control after that is a
 * filter over what is already in memory. That is the opposite of /today, which
 * refetches on a timer - and it is the right shape here for two reasons. The
 * poster is a thing you make and print in one sitting rather than a board that
 * has to be right at 7am unattended; and `/api/events` hands over roughly a
 * year in a single GET, so stepping from September to December costs nothing
 * once the page has loaded.
 *
 * `?day=` is deliberately not passed. It makes the endpoint fetch each of that
 * day's event pages for a description and a thumbnail, and a month of those
 * would be thirty-odd subrequests for text this poster has no room to print.
 *
 * Only the *type* comes from lib/events - importing the module would drag its
 * data export into this bundle. data/studios is safe to import for real: it is
 * a list and a lookup table with no data behind it.
 */
import type { SmEvent } from '../lib/events';
import { STUDIO_BY_SLUG, studiosForCategories, type Studio } from '../data/studios';
import {
  monthKey,
  monthLabel,
  monthGrid,
  shiftMonth,
  inMonth,
  compactTime,
  displayTitle,
} from '../lib/month';
import { encode, modulesFrom, mmPerModule, tooSmall, encodeError } from '../lib/print-qr';

/**
 * Where the QR points.
 *
 * `/events/types/<slug>/` is a real taxonomy archive on seattlemakers.org, so
 * each sheet's code goes to its own studio's events rather than to all 166.
 * Verified per slug by parsing the response and counting: laser-cutting 13,
 * ceramics 18, sewing 27, print-making 20, woodworking 9, and so on - the same
 * numbers those categories have in the full calendar.
 *
 * **It soft-404s, which is the thing to be careful about.** An unknown term -
 * `/events/types/nonsense-slug/` - returns HTTP 200 with a 176,553-byte page
 * titled just "Seattle Makers" and no events on it at all. So does
 * `metalworking` and so does `av-studio`, because neither has a tag on the
 * calendar (WISHLIST item 2). A 200 is not evidence the link works.
 *
 * That trap is avoided by construction rather than by sniffing the response:
 * the slug comes from the studio's own `eventCategories`, so a studio with no
 * tag has no slug and falls back to the whole calendar. The two studios that
 * would soft-404 are exactly the two with an empty `eventCategories`.
 */
const BOOK_URL = 'https://seattlemakers.org/events';

/**
 * Which of a studio's calendar tags to link at, where it has more than one.
 *
 * Only cnc needs saying. Its events are split across two archives and neither
 * URL shows both: `/types/cnc/` has 3 (the certification series) and
 * `/types/cnc-routing/` has 5 - the same 3 plus the Big CNC certifications - so
 * cnc-routing is the superset and the one to point at. Passing both does not
 * work: `/types/cnc,cnc-routing/` silently resolves to `cnc` and drops the
 * rest, which is the soft-404 problem wearing a different hat.
 *
 * leatherworking's two tags both resolve to the same single event, so its
 * first listed slug is fine and it needs no entry here.
 *
 * The real fix is one tag per studio - WISHLIST item 2.
 */
const ARCHIVE_SLUG: Record<string, string> = { cnc: 'cnc-routing' };

/** The link for what is being printed. The whole calendar, unless one studio. */
function bookingUrl(c: Choice): string {
  const s = studioOf(c);
  if (!s) return BOOK_URL;
  const slug = ARCHIVE_SLUG[s.slug] ?? s.eventCategories[0];
  return slug ? `${BOOK_URL}/types/${slug}/` : BOOK_URL;
}

/** The same address, as it is printed at the foot of the sheet. */
function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

/**
 * Operational scheduling rather than programming - the same set the reel
 * hides, and for a door sign the toggle is genuinely a judgement call rather
 * than a default. A woodshop door wants its guided-studio evenings on the
 * sheet; a poster advertising a month of classes to visitors may not.
 */
const OPEN_KINDS = new Set(['guided-studio', 'tour', 'orientation']);

/** Organisers scrap a class by editing the title, not by deleting the event. */
const CANCELLED = /\bcancell?ed\b/i;

/* ------------------------------------------------------------------ mounts */

const $ = <T extends HTMLElement = HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`calendar: missing #${id}`);
  return el as T;
};

const page = $('page');
const host = $('preview-host');
const grid = $('p-grid');
const blank = $('p-empty');
const dows = $('p-dows');
const cellTpl = $<HTMLTemplateElement>('cal-cell-tpl');
const evTpl = $<HTMLTemplateElement>('cal-ev-tpl');

const fStudio = $<HTMLSelectElement>('f-studio');
const fMonth = $('f-month');
const fPrev = $<HTMLButtonElement>('f-prev');
const fNext = $<HTMLButtonElement>('f-next');
const fGuided = $<HTMLInputElement>('f-guided');
const fQr = $<HTMLInputElement>('f-qr');
const fNote = $<HTMLInputElement>('f-note');
const fCount = $('f-count');
const fPrint = $<HTMLButtonElement>('f-print');
const warn = $('warn');

const pIcon = $<HTMLImageElement>('p-icon');
const pStudio = $('p-studio');
const pMonth = $('p-month');
const pNote = $('p-note');
const qrCard = $('p-qr-card');
const qrInk = $('p-qr');
const pvWhat = $('pv-what');
const pvSize = $('pv-size');
const pvBar = $('pv-bar');
const pvNone = $('pv-none');
const pUrl = $('p-url');

/* ------------------------------------------------------------------- state */

/**
 * The sheet is landscape, and that is not a setting.
 *
 * Both were offered at first. Landscape simply renders better and the reason
 * is arithmetic rather than taste: a cell is 10.24in / 7 = 1.46in wide against
 * portrait's 1.1in, which at 7pt is about 28 characters a line against 20. The
 * calendar's median title is 27 characters, so the same sheet that wraps onto
 * two lines in every cell portrait sits on one line landscape. Keeping the
 * worse one as an option was keeping a way to make a worse sign.
 *
 * Everything the sheet measures now lives in `#page`'s own rule in the
 * stylesheet, so there is no geometry table here any more and `@page` is a
 * static rule rather than something rewritten on every render.
 */
const PAGE_W_IN = 11;
const PAGE_H_IN = 8.5;
/**
 * The QR's box on the sheet, in inches, read off `--qr` rather than restated.
 *
 * It was a constant here that had to match the stylesheet, and within one
 * change they disagreed: `--qr` grew to 1.35in to keep the longer archive
 * links scannable and this stayed at 1.2in, so the size check measured a box
 * that no longer existed and warned that every sheet was under the threshold
 * when none of them was. A check whose input can drift from the thing it
 * checks is worse than no check - it cries wolf and then gets ignored.
 *
 * getComputedStyle hands a custom property back as authored ("1.35in"), so
 * this is a parseFloat rather than a unit conversion.
 */
function qrBoxInches(): number {
  const raw = parseFloat(getComputedStyle(page).getPropertyValue('--qr'));
  return Number.isFinite(raw) ? raw : 1.2;
}

let events: SmEvent[] | null = null;
let loadError: string | null = null;
let month = monthKey();

/* --------------------------------------------------------------- url state */

/**
 * The whole sheet lives in the query string, so a studio can bookmark its own
 * link and come back to it on the first of every month. Read once at startup
 * and rewritten with `replaceState` on every change, which keeps the address
 * bar honest without filling the back button with one entry per keystroke.
 *
 * Every value is validated rather than trusted: this link gets pasted into
 * Slack, and a malformed month would otherwise produce a grid pinned to NaN.
 */
function readUrl(): void {
  const q = new URLSearchParams(location.search);

  // Absent means nothing chosen, which is now a real state rather than a
  // synonym for "everything" - `?studio=all` is what asks for the whole space.
  const s = q.get('studio');
  if (s !== null && (s === '' || s === ALL || STUDIO_BY_SLUG.has(s))) fStudio.value = s;

  const m = q.get('month');
  if (m && /^\d{4}-(0[1-9]|1[0-2])$/.test(m)) month = m;

  if (q.get('open') === '0') fGuided.checked = false;
  if (q.get('qr') === '0') fQr.checked = false;

  const note = q.get('note');
  if (note) fNote.value = note.slice(0, 90);
}

function writeUrl(): void {
  const q = new URLSearchParams();
  if (fStudio.value) q.set('studio', fStudio.value);
  // With nothing chosen there is no sheet, so the rest of the state is not
  // worth putting in a link somebody might share.
  if (!fStudio.value) {
    history.replaceState(null, '', location.pathname);
    return;
  }
  q.set('month', month);
  if (!fGuided.checked) q.set('open', '0');
  if (!fQr.checked) q.set('qr', '0');
  if (fNote.value.trim()) q.set('note', fNote.value.trim());
  history.replaceState(null, '', `${location.pathname}?${q}`);
}

/* -------------------------------------------------------------------- data */

/** The value meaning "the whole space", as opposed to "nothing chosen yet". */
const ALL = 'all';

/**
 * What is being printed: nothing yet, the whole space, or one studio.
 *
 * Three states rather than two. The empty string used to mean "everything",
 * which made "no choice" unrepresentable - so the tool opened on a finished
 * sheet for a decision the user had not taken, and the control that mattered
 * was above a page of output nobody had asked for.
 *
 * An unrecognised slug falls back to 'none' rather than to the whole space: a
 * mistyped link should land on the instructions, not quietly print something
 * else.
 */
type Choice = 'none' | 'all' | Studio;

function choice(): Choice {
  const v = fStudio.value;
  if (!v) return 'none';
  if (v === ALL) return ALL;
  return STUDIO_BY_SLUG.get(v) ?? 'none';
}

/** The chosen studio, or null for either of the other two states. */
function studioOf(c: Choice): Studio | null {
  return c === 'none' || c === ALL ? null : c;
}

/**
 * This month's sessions for the chosen studio, soonest first.
 *
 * Cancelled classes are dropped, which is the opposite of what /today does
 * with them - and deliberately so. A board inside the space has to tell
 * somebody who turned up for a class that it is off; a sheet printed weeks in
 * advance has no such duty, and a door sign advertising a class that is not
 * happening is worse than one that never mentioned it.
 *
 * Sold-out sessions stay. The poster is a schedule, not a booking system: by
 * the time it has been on a door for a week, availability printed on it would
 * be a month out of date. That is what the QR is for.
 */
function selected(): SmEvent[] {
  const c = choice();
  if (!events || c === 'none') return [];
  const s = studioOf(c);
  return events
    .filter((e) => inMonth(e.start.slice(0, 10), month))
    .filter((e) => !CANCELLED.test(e.title))
    .filter((e) => (fGuided.checked ? true : !e.kinds.some((k) => OPEN_KINDS.has(k))))
    .filter((e) => (s ? studiosForCategories(e.categories).some((x) => x.slug === s.slug) : true))
    .sort((a, b) => a.start.localeCompare(b.start));
}

/* ------------------------------------------------------------------ the QR */

/**
 * The encoded QR for each link, built on demand and kept.
 *
 * It used to be encoded once at startup, which was right while every sheet
 * carried the same link. Now that it is per studio, switching studio needs a
 * new code - but `render()` is synchronous, so it reads whatever is cached and
 * `ensureQr` re-renders when a new one lands.
 *
 * A failure caches an empty string rather than nothing. Leaving it absent would
 * make the re-render ask for it again, and the re-render is triggered from the
 * failure path - which is an infinite loop rather than an error message.
 */
const qrCache = new Map<string, string>();
const qrPending = new Set<string>();
/** Why a link failed to encode, so the sheet can say something more useful
    than "no". print-qr's encodeError knows the "too long for a QR" case. */
const qrError = new Map<string, string>();

function ensureQr(url: string): void {
  if (qrCache.has(url) || qrPending.has(url)) return;
  qrPending.add(url);
  void encode(url)
    .then((svg) => qrCache.set(url, svg))
    // An empty string, not an absent entry: leaving it absent would make the
    // re-render below ask for it again, and the re-render is triggered from
    // this very path - which is a loop rather than an error message.
    .catch((err) => {
      qrCache.set(url, '');
      qrError.set(url, encodeError(err));
    })
    .finally(() => {
      qrPending.delete(url);
      render();
    });
}

/**
 * What, if anything, is wrong with the code about to be printed.
 *
 * Recomputed on every render rather than only when a code is encoded. It used
 * to be set from inside the encode, which meant it was never *cleared*: a
 * warning raised for one studio stayed on screen after switching to a studio
 * whose code was fine, and after switching to the whole-space sheet, which has
 * the largest modules of the lot. A stale warning about a sheet you are no
 * longer looking at is a bug that teaches people to ignore the warning.
 *
 * The silent failure of a printed QR is modules too small to scan, and nothing
 * about the sheet looks wrong when it happens - so this is checked in numbers,
 * the same way /labels does it.
 *
 * `encode()` bakes a 4-module quiet zone inside the image, so a 41-module box
 * is 33 modules of ink; `--qr` sizes the box, not what the ink looks like. The
 * check runs per link because the payload decides the version: the bare
 * calendar is 32 characters and 37 modules, a studio archive about 50 and 41 -
 * 0.93mm against 0.84mm per module at the current size, and 0.82mm against
 * 0.74mm before the box was grown to suit.
 */
function qrTrouble(
  link: string,
  svg: string | undefined,
  wanted: boolean,
): [string, 'warn' | 'error' | null] {
  // Off, or still encoding: nothing to say about it yet.
  if (!wanted || svg === undefined) return ['', null];
  if (svg === '') return [qrError.get(link) ?? 'Could not encode that link.', 'warn'];

  const modules = modulesFrom(svg);
  if (!modules) return ['', null];
  const mm = mmPerModule(qrBoxInches(), modules);
  const level = tooSmall(mm);
  if (!level) return ['', null];
  return [
    `The QR code for ${displayUrl(link)} prints at ${mm.toFixed(2)}mm per module, which is ${
      level === 'error' ? 'too small to scan' : 'smaller than is comfortable to scan'
    }. Turn the code off, or ask for a shorter link.`,
    level,
  ];
}

function setWarning(msg: string, level: 'warn' | 'error' | null): void {
  if (!level) {
    warn.hidden = true;
    warn.textContent = '';
    return;
  }
  warn.hidden = false;
  warn.dataset.level = level;
  warn.textContent = msg;
}

/* ------------------------------------------------------------------ render */

function render(): void {
  const c = choice();

  // Set before the early return below. The month and the note are
  // settings for the sheet you are about to make rather than properties of one
  // that exists, so they stay live and legible with nothing chosen - a stepper
  // reading "—" next to two working arrows is a bug, not restraint.
  fMonth.textContent = monthLabel(month);

  // Nothing chosen: there is no sheet, so there is nothing to draw, measure or
  // print. Everything below this early return builds a poster, and building one
  // for a decision the user has not made is the thing this state exists to
  // stop. The month and note controls stay live - they are the settings the
  // sheet will be made with, and freezing them would only make the page feel
  // broken before it is used.
  if (c === 'none') {
    pvNone.hidden = false;
    pvBar.hidden = true;
    host.hidden = true;
    // fit() sets this by hand, and a stale 1056px would leave a hole under the
    // placeholder where the sheet used to be.
    host.style.height = '';
    fPrint.disabled = true;
    fCount.textContent = loadError ?? 'Choose a studio to start.';
    writeUrl();
    return;
  }

  pvNone.hidden = true;
  pvBar.hidden = false;
  host.hidden = false;

  const s = studioOf(c);
  const rows = selected();

  // --- header -------------------------------------------------------------
  if (s) {
    pIcon.src = s.icon;
    pIcon.alt = '';
    pIcon.hidden = false;
    pStudio.textContent = s.name;
  } else {
    pIcon.hidden = true;
    pIcon.removeAttribute('src');
    // Not "Seattle Makers" - the eyebrow above it already says that, and a
    // front-door sheet wants a heading that describes the list under it.
    pStudio.textContent = "what's on";
  }
  pMonth.textContent = monthLabel(month);

  // The link, the code and the printed address are all one value.
  const link = bookingUrl(c);
  ensureQr(link);
  const svg = qrCache.get(link);
  qrCard.hidden = !fQr.checked || !svg;
  if (svg) qrInk.innerHTML = svg;
  pUrl.textContent = displayUrl(link);
  setWarning(...qrTrouble(link, svg, fQr.checked));

  const note = fNote.value.trim();
  pNote.textContent = note;

  // --- the grid -----------------------------------------------------------
  const weeks = monthGrid(month);
  page.style.setProperty('--weeks', String(weeks.length));

  const byDay = new Map<string, SmEvent[]>();
  for (const e of rows) {
    const day = e.start.slice(0, 10);
    byDay.set(day, [...(byDay.get(day) ?? []), e]);
  }

  grid.replaceChildren();
  for (const week of weeks) {
    for (const day of week) {
      const cell = cellTpl.content.firstElementChild!.cloneNode(true) as HTMLElement;
      const out = !inMonth(day, month);
      cell.dataset.out = out ? '1' : '0';
      const dow = new Date(`${day}T00:00:00`).getDay();
      cell.dataset.weekend = dow === 0 || dow === 6 ? '1' : '0';
      cell.querySelector('.cal-dnum')!.textContent = String(Number(day.slice(8, 10)));

      if (!out) {
        const list = cell.querySelector('.cal-evs')!;
        for (const e of byDay.get(day) ?? []) {
          const li = evTpl.content.firstElementChild!.cloneNode(true) as HTMLElement;
          li.querySelector('.cal-ev-t')!.textContent = compactTime(e.start);
          // textContent, never innerHTML: these strings come off somebody
          // else's WordPress install and land on a sheet in the building.
          li.querySelector('.cal-ev-n')!.textContent = displayTitle(e.title, s?.name);
          list.appendChild(li);
        }
      }
      grid.appendChild(cell);
    }
  }

  // An empty month is said in words rather than drawn as a blank grid: a grid
  // with nothing in it looks like the tool failed, and somebody then has to
  // decide whether to pin that to a door.
  //
  // Which words matters. "Nothing on the calendar" is a claim about the space,
  // and it must never stand in for "we have not looked yet" or "we could not
  // reach the calendar" - the same distinction /today's empty state draws, and
  // for the same reason: this one gets printed and pinned up.
  const bare = rows.length === 0;
  grid.hidden = bare;
  blank.hidden = !bare;
  // The weekday strip goes with the grid. Left up over an empty sheet it reads
  // as a calendar that failed to draw its own rows, which is the exact
  // impression the written empty state exists to replace.
  dows.hidden = bare;
  if (bare) {
    const who = s ? `${s.name} ` : '';
    blank.textContent = loadError
      ? 'Could not reach the calendar, so this sheet has nothing on it yet. Try again in a moment.'
      : !events
        ? 'Reading the calendar…'
        : `No ${who}sessions on the calendar for ${monthLabel(month)} yet. Scan the code, or visit seattlemakers.org/events, for what comes next.`;
  }

  // --- the controls -------------------------------------------------------
  pvWhat.textContent = s ? s.name : 'everything';
  pvSize.textContent = '11 × 8.5in';

  if (loadError) {
    fCount.textContent = loadError;
  } else if (!events) {
    fCount.textContent = 'Loading the calendar…';
  } else if (s && s.eventCategories.length === 0) {
    fCount.textContent = `The calendar has no tag that maps to ${s.name}, so nothing can be matched to it yet. See the wishlist.`;
  } else {
    const n = rows.length;
    fCount.textContent =
      n === 0
        ? `Nothing for ${s ? s.name : 'the space'} in ${monthLabel(month)}.`
        : `${n} session${n === 1 ? '' : 's'} in ${monthLabel(month)}.`;
  }

  fPrint.disabled = !events;

  fit();
  // After layout: a cell that cannot show everything on its day has to say so.
  if (!bare) trimCells();
  writeUrl();
}

/**
 * Hide whatever will not fit a day's cell, and count it.
 *
 * A cell is about an inch wide and an inch and a half tall, which holds three
 * or four sessions. Per studio that is never reached - the busiest studio-day
 * on the whole calendar has two - but "everything at Seattle Makers" hits six,
 * and silently clipping two of them would make the sheet wrong in a way
 * nothing on it admits to.
 *
 * Measured rather than capped at a fixed number, because the room in a cell
 * depends on the number of weeks in the month and on how many
 * lines each title wraps to. Items are hidden rather than removed so a later
 * render is a fresh clone either way.
 *
 * The 1px tolerance is not the fudge CLAUDE.md warns about on the label
 * auto-fit. There, a genuine overflow could be a single pixel of glyph side
 * bearing, so `+ 1` hid real ink. Here the smallest possible overflow is one
 * wrapped line - about nine pixels - and the tolerance only absorbs the
 * rounding in scrollHeight/clientHeight, which are integers.
 */
function trimCells(): void {
  for (const cell of Array.from(grid.children)) {
    const list = cell.querySelector<HTMLElement>('.cal-evs')!;
    const more = cell.querySelector<HTMLElement>('.cal-more')!;
    const items = [...list.children] as HTMLElement[];
    for (const li of items) li.hidden = false;
    more.hidden = true;

    let hidden = 0;
    // Never hide the last one: a cell reading only "+3 more" tells the reader
    // nothing about the day, and one session plus "+2 more" tells them enough
    // to go and look.
    while (items.length - hidden > 1 && list.scrollHeight - list.clientHeight > 1) {
      items[items.length - 1 - hidden]!.hidden = true;
      hidden++;
      more.hidden = false;
      more.textContent = `+${hidden} more`;
    }
  }
}

/**
 * Scale the sheet to the column it sits in.
 *
 * `transform`, never `zoom`: zoom re-lays-out text at the scaled size, so the
 * preview's line breaks would stop matching the print's and it would stop
 * being a preview. The cost is that a scaled element keeps its unscaled layout
 * box, so the host's height is set by hand.
 */
const PX_PER_IN = 96;

function fit(): void {
  const scale = Math.min(1, host.clientWidth / (PAGE_W_IN * PX_PER_IN));
  host.style.setProperty('--preview-scale', String(scale));
  host.style.height = `${PAGE_H_IN * PX_PER_IN * scale}px`;
}

/* ------------------------------------------------------------------- wires */

fStudio.addEventListener('change', render);
fGuided.addEventListener('change', render);
fQr.addEventListener('change', render);
fNote.addEventListener('input', render);

fPrev.addEventListener('click', () => {
  month = shiftMonth(month, -1);
  render();
});
fNext.addEventListener('click', () => {
  month = shiftMonth(month, 1);
  render();
});

fPrint.addEventListener('click', () => window.print());

/**
 * The sheet is scaled to its column, and the column changes size for reasons
 * the window knows nothing about.
 *
 * A `resize` listener was the first version and it is not enough: a tab that
 * loads while hidden lays out at zero width, so `fit()` computes a scale of 0
 * and the sheet is drawn at nothing. Becoming visible later does not resize the
 * *window*, so nothing ever put it right - the preview simply stayed blank.
 *
 * A ResizeObserver on the host fires whenever the element itself gains or
 * changes size, which covers the window moving, the sidebar reflowing at the
 * breakpoint, and a hidden tab coming forward. Same reason /today observes its
 * board rather than the window.
 */
new ResizeObserver(() => {
  if (host.hidden) return;
  fit();
  trimCells();
}).observe(host);

/* ------------------------------------------------------------------- start */

readUrl();
render();

void (async () => {
  try {
    const res = await fetch('/api/events');
    const data = await res.json();
    // `ok: false` is the endpoint saying it could not reach the calendar. An
    // empty list with ok:true would be a different and much worse thing - the
    // poster would print a confident blank month - which is why the endpoint
    // treats a zero-event parse as a failure rather than an answer.
    if (!res.ok || !data?.ok || !Array.isArray(data.events)) {
      throw new Error(data?.error ?? `HTTP ${res.status}`);
    }
    events = data.events as SmEvent[];
  } catch (err) {
    loadError = `Cannot reach the calendar right now, so there is nothing to print. (${
      err instanceof Error ? err.message : String(err)
    })`;
  }
  render();
})();
