import { calendarResponse, TTL } from '../src/lib/calendar-api.mjs';

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
 *
 * The response itself is built in src/lib/calendar-api.mjs, shared with the
 * dev-server middleware in astro.config.mjs so `npm run dev` serves the same
 * thing. There is no baked fallback: see that file, and CLAUDE.md.
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    // Only this one path is dynamic. Everything else - pages, fonts, photos -
    // is a static file, served by the assets binding rather than by us.
    if (url.pathname === '/api/events') {
      const { status, body } = await calendarResponse({
        cf: { cacheTtl: TTL, cacheEverything: true },
      });
      return new Response(body, {
        status,
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'cache-control': `public, max-age=${TTL}`,
        },
      });
    }
    return env.ASSETS.fetch(request);
  },
};
