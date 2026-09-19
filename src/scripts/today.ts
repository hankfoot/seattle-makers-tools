/**
 * Live refresh for /today.
 *
 * The page is already correct when this loads - Astro rendered today's events
 * at build time. This only replaces them with fresher data, and only when a
 * fetch actually succeeds. Every failure path is a no-op on purpose: a screen
 * in the space showing yesterday's board beats one showing an error.
 *
 * Only the *type* comes from lib/events. Importing the module would pull
 * events.json - 72K - into this bundle, which is exactly what the fetch is
 * here to avoid, so the few formatters below are deliberate duplicates.
 */
import type { SmEvent } from '../lib/events';

/** How often to refetch. Classes move on a scale of hours, not seconds. */
const POLL_MS = 5 * 60 * 1000;

const list = document.getElementById('t-list') as HTMLOListElement | null;
const empty = document.getElementById('t-empty');
const status = document.getElementById('t-status');
const dateEl = document.getElementById('t-date');
if (!list || !empty || !status || !dateEl) throw new Error('today: missing mount points');

/**
 * `?src=` points the board at another feed - that is how the dummy calendar is
 * tested (`/today?src=/events-dummy.json`). Same-origin paths only: an absolute
 * URL would both fail CORS and turn a shared link into a way to put arbitrary
 * text on a screen in the space.
 */
function source(): string {
  const raw = new URLSearchParams(location.search).get('src');
  if (!raw) return '/events.json';
  return raw.startsWith('/') && !raw.startsWith('//') ? raw : '/events.json';
}

const p2 = (n: number) => String(n).padStart(2, '0');

/** Local day as "YYYY-MM-DD", matching the feed's floating-local strings. */
function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
}

/** 14, "00" -> "2:00 pm" */
function hhmm(h: number, m: string): string {
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m} ${h < 12 ? 'am' : 'pm'}`;
}

/** "2026-09-19T14:00" -> "2:00 pm" */
function clock(iso: string): string {
  return hhmm(Number(iso.slice(11, 13)), iso.slice(14, 16));
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

function el(tag: string, cls: string, text?: string): HTMLElement {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  // textContent, never innerHTML: titles and summaries come from a scraped
  // page, so they are untrusted text and must never be parsed as markup.
  if (text !== undefined) n.textContent = text;
  return n;
}

function row(e: SmEvent): HTMLLIElement {
  const cancelled = CANCELLED.test(e.title);
  const li = el(
    'li',
    'rounded-lg border border-neutral-300 bg-white p-5 transition',
  ) as HTMLLIElement;
  if (cancelled) li.classList.add('opacity-60');

  const head = el('div', 'flex flex-wrap items-baseline gap-x-4 gap-y-1');
  head.append(el('span', 'text-2xl font-black tabular-nums text-sm-ink', clock(e.start)));
  head.append(
    el('span', 'text-xs font-bold tracking-widest text-neutral-500 uppercase', kindOf(e)),
  );

  if (cancelled) {
    head.append(el('span', 'text-xs font-bold tracking-widest text-red-700 uppercase', 'cancelled'));
  } else if (e.soldOut) {
    head.append(el('span', 'text-xs font-bold tracking-widest text-neutral-500 uppercase', 'full'));
  } else if (typeof e.available === 'number' && e.available > 0 && e.available <= 5) {
    head.append(
      el(
        'span',
        'text-xs font-bold tracking-widest text-sm-green uppercase',
        `${e.available} left`,
      ),
    );
  }
  li.append(head);

  const title = el('h2', 'mt-1 text-xl leading-snug font-bold', e.title.replace(CANCELLED, ' ').trim());
  li.append(title);

  if (e.summary) li.append(el('p', 'mt-1 line-clamp-2 text-neutral-600', e.summary));
  return li;
}

function render(events: SmEvent[], day: string): void {
  const mine = events
    .filter((e) => typeof e.start === 'string' && e.start.slice(0, 10) === day)
    .sort((a, b) => a.start.localeCompare(b.start));

  list!.replaceChildren(...mine.map(row));
  empty!.hidden = mine.length > 0;

  dateEl!.textContent = new Date(`${day}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/**
 * Two different times, and conflating them is how a board quietly lies.
 * `checked` is when we last re-read the feed; the calendar date is how old the
 * data in it actually is. Those are only the same once something keeps
 * /events.json fresh - today it is baked at build time, so a poll succeeding
 * every five minutes against a three-week-old file would otherwise read as
 * "updated 2:40 pm" and nobody would think to doubt the board.
 */
function stamp(fetchedAt?: string): string {
  const n = new Date();
  const checked = hhmm(n.getHours(), p2(n.getMinutes()));
  if (!fetchedAt) return `checked ${checked}`;
  const f = new Date(fetchedAt);
  if (Number.isNaN(f.getTime())) return `checked ${checked}`;
  return `calendar ${f.getDate()} ${MONTHS[f.getMonth()]} \u00b7 checked ${checked}`;
}

let lastDay = today();

async function refresh(): Promise<void> {
  const day = today();
  try {
    const res = await fetch(`${source()}?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()) as { events?: SmEvent[]; fetchedAt?: string };
    if (!Array.isArray(data.events)) throw new Error('shape');

    render(data.events, day);
    lastDay = day;
    status!.textContent = stamp(data.fetchedAt);
  } catch {
    // Keep whatever is on screen. Only say so if the day has rolled over,
    // because that is the one case where the board is now actually wrong.
    if (day !== lastDay) status!.textContent = 'offline - showing an older day';
  }
}

void refresh();
setInterval(() => void refresh(), POLL_MS);
// A board left up for days should catch up the moment someone wakes the screen.
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) void refresh();
});
