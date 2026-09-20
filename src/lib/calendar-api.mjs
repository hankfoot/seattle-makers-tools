import { parse, SOURCE } from './parse-calendar.mjs';
import { summarise, ogDescription } from './summarise.mjs';
import { eventImage } from './event-image.mjs';

/**
 * The /api/events response, in one place.
 *
 * Two runtimes serve this path: the Cloudflare Worker in production, and a
 * middleware in the Astro dev server so `npm run dev` behaves the same. They
 * used to be one implementation and one absence - dev simply 404'd, the board
 * fell back to a baked calendar, and nobody noticed the endpoint was untested
 * locally until the fallback was removed and every day went blank.
 *
 * Plain .mjs with no Node built-ins, for the same reason parse-calendar.mjs is:
 * a Workers runtime has none.
 */

/** Seconds the edge may serve a cached copy. A class list does not move faster. */
export const TTL = 120;

/**
 * How many event pages one response may fetch for descriptions and pictures.
 *
 * The calendar grid carries neither, so each one costs a subrequest. A day has 3
 * to 6 events, and the busiest on file has 6, so this is generous - but it is
 * a hard bound rather than a hope: without it a malformed `day` that matched
 * a hundred rows would fan out to a hundred fetches behind one request.
 */
const MAX_DESCRIBED = 10;

export { SOURCE };

/** The page fetch both enrichments share. */
const UA = 'sm-digital-toolbox/0.1 (+https://github.com/seattlemakers/sm-digital-toolbox)';

/**
 * A description and a thumbnail for one event, from a single fetch of its page.
 *
 * Both come out of the same HTML, so the picture is free: the board's
 * thumbnails cost one HEAD request each on top of what the descriptions were
 * already costing, and nothing at all for the half of the calendar whose
 * events have no picture.
 *
 * Never throws. An enrichment is a nicety - losing one costs a line of text or
 * a thumbnail, letting it throw would cost the whole board.
 */
async function enrichEvent(url, fetchImpl = fetch) {
  try {
    const res = await fetchImpl(url, { headers: { 'user-agent': UA } });
    if (!res.ok) return null;
    const html = await res.text();
    return {
      summary: summarise(ogDescription(html)),
      thumb: await eventImage(html, fetchImpl),
    };
  } catch {
    return null;
  }
}

/**
 * Fetch and parse the calendar.
 *
 * Returns `{ status, body }` where body is already a JSON string, so both
 * callers just wrap it in whatever Response their runtime uses.
 *
 * @param {object} [opts]
 * @param {string} [opts.day] - "YYYY-MM-DD". Events on this day get a
 *   description and a thumbnail fetched from their own page; everything else
 *   is returned bare. The board asks for the day it is rendering, which keeps
 *   this to a handful of subrequests instead of one per event in the
 *   calendar.
 * @param {object} [opts.init] - passed to fetch; the Worker uses it for its
 *   `cf` cache hints. Node ignores them.
 */
export async function calendarResponse({ day, init = {} } = {}) {
  try {
    const res = await fetch(SOURCE, {
      headers: { 'user-agent': UA },
      ...init,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const events = parse(await res.text());
    // A zero-event parse means the calendar's markup moved, not that the space
    // has nothing on. Serving that would silently empty every board, so treat
    // it as a failure, exactly as the scraper exits non-zero.
    if (!events.length) throw new Error('parsed zero events');

    // Descriptions and thumbnails, for the one day being looked at.
    if (day && /^\d{4}-\d{2}-\d{2}$/.test(day)) {
      const wanted = events.filter((e) => e.start.slice(0, 10) === day).slice(0, MAX_DESCRIBED);
      // In parallel: sequentially this would be six round trips to a WordPress
      // site stacked behind one board refresh.
      const extra = await Promise.all(wanted.map((e) => enrichEvent(e.url)));
      wanted.forEach((e, i) => {
        if (extra[i]?.summary) e.summary = extra[i].summary;
        if (extra[i]?.thumb) e.thumb = extra[i].thumb;
      });
    }

    return {
      status: 200,
      body: JSON.stringify({
        ok: true,
        source: SOURCE,
        fetchedAt: new Date().toISOString(),
        live: true,
        count: events.length,
        events,
      }),
    };
  } catch (err) {
    // No fallback calendar. A failure is reported as a failure - what must
    // never happen is an empty list with `ok: true`, because the board would
    // render "Nothing on the calendar today", which is a confident lie about
    // the space rather than an admission that we could not look.
    return {
      status: 502,
      body: JSON.stringify({ ok: false, error: String(err?.message ?? err) }),
    };
  }
}
