// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import { calendarResponse } from './src/lib/calendar-api.mjs';

/**
 * Serve /api/events from the dev server too.
 *
 * In production that path is the Cloudflare Worker. Under `astro dev` there is
 * no Worker, so it used to 404 - which was invisible while the board could
 * fall back to a calendar baked in at build time, and became "every day is
 * empty" the moment that fallback was removed. Same module as the Worker uses,
 * so dev and production cannot answer differently.
 *
 * `astro preview` is a different server and does not get this. Use
 * `npm run serve` for a production-shaped check.
 */
/** @returns {import('astro').AstroIntegration} */
function calendarApi() {
  return {
    name: 'seattle-makers:calendar-api',
    hooks: {
      'astro:server:setup': ({ server }) => {
        server.middlewares.use(
          /**
           * @param {import('node:http').IncomingMessage} req
           * @param {import('node:http').ServerResponse} res
           * @param {() => void} next
           */
          async (req, res, next) => {
            // The base is a throwaway: req.url is a path, and URL needs one.
            if (!req.url) return next();
            const u = new URL(req.url, 'http://localhost');
            if (u.pathname !== '/api/events') return next();
            const { status, body } = await calendarResponse({
              day: u.searchParams.get('day') ?? undefined,
            });
            res.statusCode = status;
            res.setHeader('content-type', 'application/json; charset=utf-8');
            res.end(body);
          },
        );
      },
    },
  };
}

export default defineConfig({
  // Static output: the whole point is that the reel keeps running when the
  // market venue's wifi does not.
  output: 'static',
  integrations: [calendarApi()],
  vite: { plugins: [tailwindcss()] },
});
