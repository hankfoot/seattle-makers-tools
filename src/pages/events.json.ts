import type { APIRoute } from 'astro';
import raw from '../data/events.json';

/**
 * The calendar, served from our own origin.
 *
 * This exists so /today can refetch on an interval without a rebuild. It has
 * to be same-origin: seattlemakers.org sends no `access-control-allow-origin`
 * (checked), and there is no API behind it either - WP REST and /wp-json/ 401,
 * ?ical=1 returns HTML, /events/feed/ carries post-publish dates rather than
 * event dates. A browser therefore cannot read the calendar directly, and this
 * endpoint is the seam where a scheduled rebuild - or later a proxy function -
 * drops fresher data in without the page changing.
 *
 * Prerendered to a flat file by `output: 'static'`, so it costs no runtime.
 */
export const GET: APIRoute = () =>
  new Response(JSON.stringify(raw), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=300',
    },
  });
