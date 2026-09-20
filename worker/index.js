import { parse, SOURCE } from '../src/lib/parse-calendar.mjs';
// `with { type: 'json' }` is the standard form: Node refuses a bare JSON
// import without it, and the Workers bundler accepts it either way.
//
// This is the *reel's* calendar, not a fallback for this endpoint. It is read
// here for one thing only: event descriptions. See SUMMARIES below.
import baked from '../src/data/events.json' with { type: 'json' };

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
 * Runs as a Cloudflare Worker with static assets: this script handles
 * /api/events and hands everything else to the ASSETS binding, which serves
 * the Astro build out of dist/. Astro stays `output: 'static'` - no adapter, no
 * hybrid rendering, nothing about the label maker or the reel changes.
 *
 * This was a Pages Function first. Cloudflare's git integration now creates
 * Workers rather than Pages projects, and runs `wrangler deploy`, which wants a
 * Worker entry point - a Pages-shaped `functions/` directory fails the deploy
 * outright. Workers with static assets is also the platform Cloudflare is
 * actually developing, so this is the form the makerspace should inherit.
 */

/** Seconds the edge may serve a cached copy. A class list does not move faster. */
const TTL = 120;

/**
 * Summaries come from per-event pages the scraper visits; the calendar grid
 * this endpoint reads has none at all. Graft the known ones on by title so live
 * rows keep their blurb - about half of them match.
 *
 * This is the one thing the baked file still does for the board. It is content,
 * not freshness: a class description ages far more slowly than a schedule, and
 * a missing one costs a line of text rather than making the board wrong. The
 * *calendar* half of this file is no longer served here at all.
 */
const SUMMARIES = new Map(
  (baked.events ?? []).filter((e) => e.summary).map((e) => [e.title, e.summary]),
);

function envelope(events, fetchedAt, live) {
  return JSON.stringify({
    ok: true,
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

async function events() {
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
  } catch (err) {
    // No fallback calendar. This endpoint used to hand back the build-time
    // copy, which meant a board could sit on a wall quietly showing a schedule
    // from weeks earlier; the file only refreshed when somebody remembered to
    // run `npm run events`, and nobody did.
    //
    // So a failure is now reported as a failure. What must never happen is
    // returning an empty list with `ok: true` - the board would render
    // "Nothing on the calendar today", which is a confident lie about the
    // space rather than an admission that we could not look.
    return json(
      JSON.stringify({ ok: false, error: String(err && err.message ? err.message : err) }),
      502,
    );
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    // Only this one path is dynamic. Everything else - pages, the prerendered
    // /events.json fallback, fonts, photos - is a static file, served by the
    // assets binding rather than by anything we write.
    if (url.pathname === '/api/events') return events();
    return env.ASSETS.fetch(request);
  },
};
