import { parse, SOURCE } from './parse-calendar.mjs';

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

export { SOURCE };

/**
 * Fetch and parse the calendar.
 *
 * Returns `{ status, body }` where body is already a JSON string, so both
 * callers just wrap it in whatever Response their runtime uses.
 *
 * `init` lets the Worker pass its `cf` cache hints; Node ignores them.
 */
export async function calendarResponse(init = {}) {
  try {
    const res = await fetch(SOURCE, {
      headers: {
        'user-agent':
          'seattle-makers-tools/0.1 (+https://github.com/hankfoot/seattle-makers-tools)',
      },
      ...init,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const events = parse(await res.text());
    // A zero-event parse means the calendar's markup moved, not that the space
    // has nothing on. Serving that would silently empty every board, so treat
    // it as a failure, exactly as the scraper exits non-zero.
    if (!events.length) throw new Error('parsed zero events');

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
