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
import { writeFileSync, readFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse, SOURCE } from '../src/lib/parse-calendar.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'src/data/events.json');
const IMG_DIR = resolve(ROOT, 'public/events');

/**
 * Below this width an event's own image is a category logo tile rather than a
 * photograph (the site has a batch of 300px ones), and it would be upscaled
 * past the point of looking deliberate in the card's 392x476 frame. Those
 * events fall back to a studio photo instead.
 */
const MIN_IMAGE_WIDTH = 600;

/**
 * Minimum compressed bytes per pixel for an image to count as a photograph.
 *
 * Size alone does not separate the site's per-category logo tiles from real
 * class photos - both come through at 1220px. Compression does: flat artwork
 * with big even areas squeezes to a fraction of what a photo needs. Measured
 * across the current calendar, the logo tiles land at 0.018-0.054 bytes/px and
 * every actual photograph at 0.080 or above, so the gap is wide and 0.06 sits
 * in the middle of it.
 *
 * Promotional graphics (a game-night poster, a sew-along flyer) score like
 * photos and are kept - they are real artwork for that event, which is the
 * point. If a logo ever slips through, delete it from public/events/ and the
 * card falls back to a studio photo.
 */
const MIN_BYTES_PER_PIXEL = 0.06;

const res = await fetch(SOURCE, {
  headers: { 'user-agent': 'sm-digital-toolbox/0.1 (+https://github.com/seattlemakers/sm-digital-toolbox)' },
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

/* ------------------------------------------------------------------ images */

/** Site chrome and emoji fallbacks, never the event's own picture. */
const IMAGE_JUNK = /Logo-final|cropped-|s\.w\.org|\/emoji\/|favicon|logo-?\d*\.svg/i;

/** WordPress writes "name-800x600.jpg" thumbnails; "name.jpg" is the original. */
const stripSize = (url) => url.replace(/-\d+x\d+(\.[a-z]+)$/i, '$1');

/**
 * Best image on an event page, as {url, width}.
 *
 * Candidates come from srcset (which states widths outright), og:image (which
 * states its width in a sibling meta tag) and any remaining uploads URL. The
 * generated "-800x600" variants are collapsed onto their original, since the
 * original is always at least as large.
 */
function bestImage(html) {
  const byUrl = new Map();
  const offer = (url, width) => {
    if (!url || IMAGE_JUNK.test(url)) return;
    if (!/\.(jpe?g|png|webp)$/i.test(url)) return;
    const key = stripSize(url);
    byUrl.set(key, Math.max(byUrl.get(key) ?? 0, width || 0));
  };

  for (const s of html.matchAll(/srcset="([^"]+)"/g)) {
    for (const part of s[1].split(',')) {
      const m = /\s*(https?:\/\/\S+?)\s+(\d+)w/.exec(part);
      if (m) offer(m[1], Number(m[2]));
    }
  }

  const og = /<meta\s+property="og:image"\s+content="([^"]+)"/i.exec(html);
  const ogw = /<meta\s+property="og:image:width"\s+content="(\d+)"/i.exec(html);
  if (og) offer(og[1], ogw ? Number(ogw[1]) : 0);

  for (const m of html.matchAll(/https:\/\/seattlemakers\.org\/wp-content\/uploads\/[^"'\s)]+/g)) {
    offer(m[0], 0);
  }

  let best = null;
  for (const [url, width] of byUrl) {
    if (!best || width > best.width) best = { url, width };
  }
  return best;
}

/** Width and height straight from the file header - no image library needed. */
function imageSize(buf) {
  if (buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i < buf.length - 9) {
      if (buf[i] !== 0xff) { i++; continue; }
      const marker = buf[i + 1];
      // SOF0..SOF15, excluding DHT (c4), JPG (c8) and DAC (cc)
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
      }
      i += 2 + buf.readUInt16BE(i + 2);
    }
  }
  return null;
}

const slugify = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'event';

/**
 * Fit a blurb to the card: four lines at the deck's size is roughly 200
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

/**
 * cache: title -> { summary, image }
 *
 * `image` is null when the page was checked and had nothing usable, which is
 * different from the title being absent. Without that distinction every run
 * would re-fetch the pages that simply have no picture.
 */
const cache = new Map();
if (existsSync(OUT)) {
  try {
    for (const e of JSON.parse(readFileSync(OUT, 'utf8')).events ?? []) {
      if (e.checked) cache.set(e.title, { summary: e.summary ?? null, image: e.image ?? null });
    }
  } catch {
    /* a corrupt cache is not a reason to fail; just refetch. */
  }
}

const wanted = [...new Map(events.filter(worthEnriching).map((e) => [e.title, e])).values()];
const todo = wanted.filter((e) => !cache.has(e.title));
let fetched = 0;
let failed = 0;
let images = 0;
let tooSmall = 0;
let logos = 0;

mkdirSync(IMG_DIR, { recursive: true });

/** Download an event's picture next to the other assets, keeping the reel local. */
async function saveImage(candidate, title) {
  const r = await fetch(candidate.url, { headers: { 'user-agent': 'sm-digital-toolbox/0.1' } });
  if (!r.ok) return null;
  const buf = Buffer.from(await r.arrayBuffer());

  // Trust the file over the markup: srcset widths are occasionally wrong, and
  // an upscaled logo tile is the one thing worth rejecting here.
  const size = imageSize(buf);
  const width = size?.width ?? candidate.width;
  if (!width || width < MIN_IMAGE_WIDTH) { tooSmall++; return null; }

  if (size) {
    const density = buf.length / (size.width * size.height);
    if (density < MIN_BYTES_PER_PIXEL) { logos++; return null; }
  }

  const ext = /\.png$/i.test(candidate.url) ? 'png' : /\.webp$/i.test(candidate.url) ? 'webp' : 'jpg';
  const file = `${slugify(title)}.${ext}`;
  writeFileSync(resolve(IMG_DIR, file), buf);
  images++;
  return `/events/${file}`;
}

async function enrich(e) {
  try {
    const r = await fetch(e.url, { headers: { 'user-agent': 'sm-digital-toolbox/0.1' } });
    if (!r.ok) { failed++; return; }
    const html = await r.text();

    const m = /<meta\s+property="og:description"\s+content="([^"]*)"/i.exec(html)
      || /<meta\s+name="description"\s+content="([^"]*)"/i.exec(html);
    const summary = m && m[1].trim() ? tidySummary(decode(m[1])) : null;

    let image = null;
    const candidate = bestImage(html);
    if (candidate) {
      try {
        image = await saveImage(candidate, e.title);
      } catch {
        /* One missing picture is not worth failing the refresh over. */
      }
    }

    cache.set(e.title, { summary, image });
    fetched++;
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
  const hit = cache.get(e.title);
  if (!hit) continue;
  e.checked = true;
  // tidySummary is idempotent, so this also re-tidies anything cached by an
  // older run of this script.
  if (hit.summary) e.summary = tidySummary(hit.summary);
  if (hit.image) e.image = hit.image;
}

// Drop downloads belonging to events that have fallen off the calendar.
const keep = new Set(
  [...cache.values()].map((v) => v.image).filter(Boolean).map((p) => p.replace('/events/', '')),
);
let pruned = 0;
for (const f of readdirSync(IMG_DIR)) {
  if (!keep.has(f)) { unlinkSync(resolve(IMG_DIR, f)); pruned++; }
}

console.log(
  `fetch-events: ${cache.size} pages known (${fetched} fetched, ${failed} failed) · ` +
    `${images} images saved, ${tooSmall} too small, ${logos} logo tiles skipped, ${pruned} pruned`,
);

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
