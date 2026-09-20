/**
 * The event's own picture, for the board's thumbnails.
 *
 * Like summarise.mjs, this reads one event page - and it is called from the
 * same fetch, so a thumbnail costs nothing beyond what the description already
 * cost. Pure string-handling plus one HEAD request; no fs, no Node built-ins,
 * because the Workers runtime has none.
 *
 * **`og:image` is the only picture these pages state about themselves**, and
 * roughly half of them have none at all - measured across 34 distinct events,
 * 20 carried one. A row without a picture is therefore the normal case, not a
 * fault, and the board has to look right with a mix of both.
 *
 * What it hands back is not always a photograph. Three kinds of thing turn up:
 *
 *   1. Real class photos and promotional artwork, at 564-1220px.
 *   2. Small studio badges: `laser_logo.jpg`, `woodshop_saw_logo.jpg`, both
 *      300x300.
 *   3. Full-size flat artwork: `tour_icon.jpg` at 768x768,
 *      `Website-black-icons-20.png` at 1219x1220, and Yoast's emoji fallback
 *      `1f600.svg`.
 *
 * (2) is caught by width, (3) by compression density, and the svg by the
 * extension test. That density rule is the scraper's - see fetch-events.mjs -
 * and it is the only one that separates a 1220px icon sheet from a 1220px
 * photograph, because size cannot.
 */

/** Where this site keeps its uploads. Anything else is chrome or off-site. */
const UPLOADS = /^https:\/\/seattlemakers\.org\/wp-content\/uploads\//;

/** Site chrome and Yoast's fallbacks, never the event's own picture. */
const JUNK = /Logo-final|cropped-|s\.w\.org|\/emoji\/|favicon/i;

/**
 * Below this the picture is a studio badge rather than a photograph. The two
 * on the calendar today are both 300x300, and the board's thumbnail is ~380px
 * on a 1080p screen, so this is also simply the size that renders.
 */
export const MIN_IMAGE_WIDTH = 600;

/**
 * Minimum compressed bytes per pixel for an image to count as a photograph.
 *
 * The scraper's constant and the scraper's reasoning: flat artwork with big
 * even areas squeezes to a fraction of what a photo needs, and that is the
 * only signal that separates the site's full-size icon sheets from real class
 * photos. Measured on the live calendar: `Website-black-icons-20.png` 0.018,
 * `tour_icon.jpg` 0.028, against 0.080-0.492 for every photograph.
 *
 * It costs one false negative that is visible today - `screenprinting.jpg` at
 * 0.054 is a real photo of a flat, evenly-lit print - which is the trade the
 * reel already accepted.
 */
export const MIN_BYTES_PER_PIXEL = 0.06;

/**
 * Smallest srcset variant worth serving to a thumbnail.
 *
 * WordPress generates 300/768/1024 variants beside every original. The board
 * shows the picture at about 20% of a screen's short side - 380px on 1080p,
 * 760px on a 4K panel - so 768 is the honest size and the 1220px original is
 * three times the bytes for nothing. Rows are cheap but a wall board fetches
 * every one of them; on today's calendar this is 250K rather than 700K.
 */
const THUMB_WIDTH = 640;

/** `<meta property="og:image">` and its stated dimensions, in either order. */
export function ogImage(html) {
  const url = meta(html, 'og:image');
  if (!url) return null;
  return {
    url,
    width: Number(meta(html, 'og:image:width')) || 0,
    height: Number(meta(html, 'og:image:height')) || 0,
  };
}

function meta(html, property) {
  const m =
    new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']*)["']`, 'i').exec(html) ||
    new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*property=["']${property}["']`, 'i').exec(html);
  return m ? m[1].trim() : null;
}

/**
 * Whether this is worth weighing at all: our own uploads, a raster format, not
 * chrome, and big enough to be a photograph rather than a badge.
 *
 * A stated width is *required*. Without one there is no way to tell a badge
 * from a photo before downloading it, and every page that carries an og:image
 * carries the width beside it - so a missing one means the markup moved, which
 * is a reason to show nothing rather than to guess.
 */
function usable(img) {
  return Boolean(
    img &&
      UPLOADS.test(img.url) &&
      !JUNK.test(img.url) &&
      /\.(jpe?g|png|webp)$/i.test(img.url.split('?')[0]) &&
      img.width >= MIN_IMAGE_WIDTH &&
      img.height > 0,
  );
}

/** WordPress writes "name-800x600.jpg" beside "name.jpg". */
const stripSize = (url) => url.replace(/-\d+x\d+(\.[a-z]+)$/i, '$1');

/**
 * The smallest generated variant of this same image at or above THUMB_WIDTH,
 * or the original when there is none.
 *
 * Only variants of the *same* original count - the page's srcsets also carry
 * every other picture on it, and picking one of those would put another
 * event's photo on this row.
 */
export function thumbVariant(html, url) {
  const original = stripSize(url);
  let best = null;
  for (const s of html.matchAll(/srcset="([^"]+)"/g)) {
    for (const part of s[1].split(',')) {
      const m = /\s*(https?:\/\/\S+?)\s+(\d+)w/.exec(part);
      if (!m) continue;
      const [, candidate, w] = m;
      if (stripSize(candidate) !== original) continue;
      const width = Number(w);
      if (width < THUMB_WIDTH) continue;
      if (!best || width < best.width) best = { url: candidate, width };
    }
  }
  return best ? best.url : url;
}

/** Compressed size of the original, from a HEAD. Null when it cannot be had. */
async function weigh(url, fetchImpl) {
  try {
    const res = await fetchImpl(url, {
      method: 'HEAD',
      headers: { 'user-agent': 'sm-digital-toolbox/0.1' },
    });
    if (!res.ok) return null;
    const len = Number(res.headers.get('content-length'));
    return Number.isFinite(len) && len > 0 ? len : null;
  } catch {
    return null;
  }
}

/**
 * The thumbnail for one event page's HTML, or null.
 *
 * The density test weighs the **original**, whose dimensions the page states
 * exactly, and then serves the smaller variant. Weighing the variant instead
 * would compare a downscale against a threshold calibrated on originals, and a
 * downscaled photograph carries more detail per pixel than the full-size one
 * it came from.
 *
 * An image that cannot be weighed is kept. Losing every thumbnail on the board
 * because a CDN stopped sending `content-length` is a worse failure than the
 * occasional icon sheet getting through, and the width test has already
 * removed the badges by this point.
 */
export async function eventImage(html, fetchImpl = fetch) {
  const img = ogImage(html);
  if (!usable(img)) return null;

  const bytes = await weigh(img.url, fetchImpl);
  if (bytes !== null && bytes / (img.width * img.height) < MIN_BYTES_PER_PIXEL) return null;

  return thumbVariant(html, img.url);
}
