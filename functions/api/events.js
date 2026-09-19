import { parse, SOURCE } from '../../src/lib/parse-calendar.mjs';
// `with { type: 'json' }` is the standard form: Node refuses a bare JSON
// import without it, and the Workers bundler accepts it either way.
import baked from '../../src/data/events.json' with { type: 'json' };

/**
 * The calendar, scraped on demand.
 *
 * This is the whole reason /today can be live. A browser cannot read
 * seattlemakers.org itself - that page sends no `access-control-allow-origin`,
 * so the fetch fails before any of our code sees a byte. Here there is no such
 * rule: server-to-server requests are not subject to CORS, so this fetches the
 * page, runs the same parser the scraper uses, and hands back JSON from our own
 * origin, which the page *is* allowed to read.
 *
 * Runs on Cloudflare Pages Functions, next to the static build. Astro stays
 * `output: 'static'` - no adapter, no hybrid rendering, nothing about the label
 * maker or the reel changes.
 */

/** Seconds the edge may serve a cached copy. A class list does not move faster. */
const TTL = 120;

/** Summaries come from per-event pages the scraper visits; the calendar grid
 *  has none. Graft the known ones on by title so live rows keep their blurb. */
const SUMMARIES = new Map(
  (baked.events ?? []).filter((e) => e.summary).map((e) => [e.title, e.summary]),
);

function envelope(events, fetchedAt, live) {
  return JSON.stringify({
    source: SOURCE,
    fetchedAt,
    live,
    count: events.length,
    events,
  });
}

const json = (body, status = 200) =>
  new Response(body, {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': `public, max-age=${TTL}`,
    },
  });

export async function onRequestGet() {
  try {
    const res = await fetch(SOURCE, {
      headers: { 'user-agent': 'seattle-makers-tools/0.1 (+https://github.com/hankfoot/seattle-makers-tools)' },
      cf: { cacheTtl: TTL, cacheEverything: true },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const events = parse(await res.text());
    // A zero-event parse means the calendar's markup moved, not that the space
    // has nothing on. Serving that would silently empty every board, so treat
    // it as a failure and fall back, exactly as the scraper exits non-zero.
    if (!events.length) throw new Error('parsed zero events');

    for (const e of events) {
      const s = SUMMARIES.get(e.title);
      if (s) e.summary = s;
    }
    return json(envelope(events, new Date().toISOString(), true));
  } catch {
    // Hand back the build-time calendar with *its* own date, never today's.
    // The board prints that date, so a failure here shows up as old data
    // rather than as fresh data that happens to be wrong.
    return json(envelope(baked.events ?? [], baked.fetchedAt, false));
  }
}
