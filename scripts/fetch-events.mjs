#!/usr/bin/env node
/**
 * Scrape the Seattle Makers events calendar into src/data/events.json.
 *
 * Why scraping: the WordPress REST API and /wp-json/ both 401, ?ical=1 returns
 * HTML, and /events/feed/ carries only post-publish dates rather than event
 * dates. The calendar page itself is the only public source of real event
 * times, and it hands over ~a year of events in one unauthenticated GET.
 *
 * Each event is an anchor whose `title` attribute holds unescaped HTML:
 *
 *   <a title="<div class=pe-hover-title>Laser Cutter Certification (0 avail)</div>
 *             <div class=pe-hover-date>August 5, 2026 6:00 pm</div>
 *             <div class=pe-hover-date>August 5, 2026 8:30 pm*1785961800*</div>"
 *      href="https://seattlemakers.org/events/laser-cutter-certification-311/"
 *      rel="157345" class="pp-tip certification laser-cutting pe-inv-out pp-tip">
 *
 * Times are stored as floating local strings ("2026-08-05T18:00") rather than
 * UTC instants. The calendar publishes wall-clock Seattle time and the market
 * PC runs in Seattle, so keeping them floating renders exactly what the site
 * says and sidesteps a whole class of timezone-conversion bugs.
 */
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'src/data/events.json');
const SOURCE = 'https://seattlemakers.org/events';

/** Slugs on the anchor that describe the kind of event, not the studio. */
const KINDS = ['class', 'certification', 'guided-studio', 'meetup', 'orientation', 'tour'];
/** Bookkeeping classes emitted by the calendar plugin, never taxonomy. */
const NOISE = new Set(['pp-tip', 'pe-inv-out', 'wposted', 'dashicons']);

const MONTHS = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

const pad = (n) => String(n).padStart(2, '0');

/** "August 5, 2026 6:00 pm" -> "2026-08-05T18:00" (floating local time). */
function parseWhen(text) {
  const m = /^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})\s+(\d{1,2}):(\d{2})\s*(am|pm)$/i.exec(text.trim());
  if (!m) return null;
  const month = MONTHS[m[1].toLowerCase()];
  if (!month) return null;
  let hour = Number(m[4]) % 12;
  if (m[6].toLowerCase() === 'pm') hour += 12;
  return `${m[3]}-${pad(month)}-${pad(Number(m[2]))}T${pad(hour)}:${m[5]}`;
}

function decode(s) {
  return s
    .replace(/&#8217;|&#039;|&apos;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8220;|&#8221;/g, '"')
    .replace(/&#8211;|&#8212;/g, '-')
    .replace(/&hellip;|&#8230;/g, '…')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/\s+/g, ' ')
    .trim();
}

function parse(html) {
  const anchor = /<a\s+title="([^"]*)"\s+href="([^"]+)"\s+rel="(\d+)"\s+class="([^"]*)"/g;
  const events = [];
  const seen = new Set();

  for (const m of html.matchAll(anchor)) {
    const [, titleAttr, href, rel, classAttr] = m;
    if (!classAttr.includes('pp-tip')) continue;

    const titleMatch = /pe-hover-title[^>]*>(.*?)<\/div>/s.exec(titleAttr);
    if (!titleMatch) continue;

    const dates = [...titleAttr.matchAll(/pe-hover-date[^>]*>(.*?)<\/div>/gs)].map((d) => d[1]);
    if (dates.length < 1) continue;

    // Availability is appended to the title as "(N avail)".
    let name = decode(titleMatch[1].replace(/<[^>]+>/g, ''));
    let available = null;
    const avail = /\((\d+)\s*avail\)\s*$/i.exec(name);
    if (avail) {
      available = Number(avail[1]);
      name = name.slice(0, avail.index).trim();
    }

    const endRaw = dates[dates.length - 1];
    const tsMatch = /\*(\d{9,11})\*/.exec(endRaw);
    const start = parseWhen(decode(dates[0].replace(/<[^>]+>/g, '')));
    const end = parseWhen(decode(endRaw.replace(/\*\d+\*/, '').replace(/<[^>]+>/g, '')));
    if (!start) continue;

    const categories = classAttr
      .split(/\s+/)
      .filter((c) => c && !NOISE.has(c));

    // The same event can appear more than once in the grid (multi-day series
    // render on each day they touch); the post id plus start time is unique.
    const key = `${rel}@${start}`;
    if (seen.has(key)) continue;
    seen.add(key);

    events.push({
      id: Number(rel),
      title: name,
      url: href,
      start,
      end: end ?? null,
      endTs: tsMatch ? Number(tsMatch[1]) : null,
      available,
      soldOut: classAttr.includes('pe-inv-out') || available === 0,
      kinds: categories.filter((c) => KINDS.includes(c)),
      categories: categories.filter((c) => !KINDS.includes(c)),
    });
  }

  events.sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : a.id - b.id));
  return events;
}

const res = await fetch(SOURCE, {
  headers: { 'user-agent': 'seattle-makers-tools/0.1 (+https://github.com/hankfoot/seattle-makers-tools)' },
});
if (!res.ok) {
  console.error(`fetch-events: ${SOURCE} returned HTTP ${res.status}`);
  process.exit(1);
}

const events = parse(await res.text());

/**
 * The calendar grid carries no description, so pull `og:description` from each
 * event's own page. One fetch per distinct title, not per occurrence - a class
 * that runs twenty times has one blurb - and previously fetched blurbs are
 * reused so re-runs cost almost nothing.
 *
 * Operational events (open studio hours, tours, orientations) never reach a
 * slide, so they are not worth a request.
 */
const SKIP_KINDS = new Set(['guided-studio', 'tour', 'orientation']);
const worthEnriching = (e) => !e.kinds.some((k) => SKIP_KINDS.has(k));

/**
 * Fit a blurb to the card: three lines at the deck's size is roughly 200
 * characters. Cut on a sentence boundary where there is one, so the card ends
 * on a full thought rather than mid-clause. Yoast appends its own "[...]"
 * truncation marker, which goes first.
 */
function tidySummary(text) {
  let s = text.replace(/\s*\[\s*…\s*\]\s*$/, '').replace(/\s*…\s*$/, '').trim();
  if (s.length <= 200) return s;

  const cut = s.slice(0, 200);
  const sentence = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
  if (sentence > 90) return cut.slice(0, sentence + 1);
  const word = cut.lastIndexOf(' ');
  return `${cut.slice(0, word > 0 ? word : 200).replace(/[,;:]$/, '')}…`;
}

const cache = new Map();
if (existsSync(OUT)) {
  try {
    for (const e of JSON.parse(readFileSync(OUT, 'utf8')).events ?? []) {
      if (e.summary) cache.set(e.title, e.summary);
    }
  } catch {
    /* a corrupt cache is not a reason to fail; just refetch. */
  }
}

const wanted = [...new Map(events.filter(worthEnriching).map((e) => [e.title, e])).values()];
const todo = wanted.filter((e) => !cache.has(e.title));
let fetched = 0;
let failed = 0;

async function enrich(e) {
  try {
    const r = await fetch(e.url, { headers: { 'user-agent': 'seattle-makers-tools/0.1' } });
    if (!r.ok) { failed++; return; }
    const html = await r.text();
    const m = /<meta\s+property="og:description"\s+content="([^"]*)"/i.exec(html)
      || /<meta\s+name="description"\s+content="([^"]*)"/i.exec(html);
    if (m && m[1].trim()) { cache.set(e.title, tidySummary(decode(m[1]))); fetched++; }
  } catch {
    failed++;
  }
}

// Modest concurrency - this is someone's production WordPress box.
const CONCURRENCY = 6;
const queue = [...todo];
await Promise.all(
  Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
    while (queue.length) await enrich(queue.pop());
  }),
);

for (const e of events) {
  const summary = cache.get(e.title);
  // tidySummary is idempotent, so this also re-tidies anything cached by an
  // older run of this script.
  if (summary) e.summary = tidySummary(summary);
}
console.log(`fetch-events: descriptions ${cache.size} known (${fetched} new, ${todo.length - fetched - failed} unchanged, ${failed} failed)`);

// Fail loudly rather than quietly shipping an empty reel. If the calendar's
// markup ever changes, the previous events.json stays put and the build keeps
// working off known-good data.
if (events.length === 0) {
  console.error('fetch-events: parsed 0 events - the calendar markup likely changed.');
  console.error(existsSync(OUT) ? `Leaving ${OUT} untouched.` : 'No previous data to fall back on.');
  process.exit(1);
}

mkdirSync(dirname(OUT), { recursive: true });
const payload = {
  source: SOURCE,
  fetchedAt: new Date().toISOString(),
  count: events.length,
  events,
};
writeFileSync(OUT, JSON.stringify(payload, null, 2) + '\n');

const kinds = {};
for (const e of events) for (const k of e.kinds.length ? e.kinds : ['(none)']) kinds[k] = (kinds[k] ?? 0) + 1;
const cats = {};
for (const e of events) for (const c of e.categories.length ? e.categories : ['(none)']) cats[c] = (cats[c] ?? 0) + 1;

console.log(`fetch-events: ${events.length} events, ${events[0].start} -> ${events[events.length - 1].start}`);
console.log('  kinds     ', Object.entries(kinds).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join(' '));
console.log('  categories', Object.entries(cats).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join(' '));
console.log(`  -> ${OUT}`);
