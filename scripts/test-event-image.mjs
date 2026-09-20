/**
 * Tests for lib/event-image.mjs - finding the event's own picture.
 *
 * Every fixture below is taken from a real seattlemakers.org event page, and
 * every byte count is a real `content-length` measured against the live site
 * on 2026-09-20. The three cases that matter are all things that calendar
 * actually serves: a photograph, a 300px studio badge, and a full-size sheet
 * of flat icons that no size test can tell from a photograph.
 *
 * No network: `fetch` is stubbed, which is also how the byte counts stay
 * meaningful as a record of what was measured.
 */
import { ogImage, thumbVariant, eventImage } from '../src/lib/event-image.mjs';

let pass = 0, fail = 0;
const eq = (got, want, label) => {
  if (got === want) pass++;
  else { fail++; console.log(`  FAIL ${label}\n       got  ${JSON.stringify(got)}\n       want ${JSON.stringify(want)}`); }
};

const UP = 'https://seattlemakers.org/wp-content/uploads';

/** One event page, reduced to the parts this module reads. */
const page = ({ url, w, h, srcset = '' }) => `
  <html><head>
  <meta property="og:image" content="${url}" />
  <meta property="og:image:width" content="${w}" />
  <meta property="og:image:height" content="${h}" />
  </head><body>
  ${srcset ? `<img srcset="${srcset}" />` : ''}
  </body></html>`;

/** A fetch that answers HEAD with one content-length and nothing else. */
const weighing = (bytes) => async () => ({
  ok: true,
  headers: { get: (k) => (k === 'content-length' && bytes !== null ? String(bytes) : null) },
});

/* ------------------------------------------------------------- og:image --- */

eq(ogImage(page({ url: `${UP}/2023/09/silkscreen-printing.jpg`, w: 1220, h: 808 }))?.url,
   `${UP}/2023/09/silkscreen-printing.jpg`, 'og:image url');
eq(ogImage(page({ url: `${UP}/a.jpg`, w: 1220, h: 808 }))?.width, 1220, 'og:image:width');
eq(ogImage('<meta content="https://x/a.jpg" property="og:image">')?.url,
   'https://x/a.jpg', 'attributes in the other order');
eq(ogImage('<html><head></head></html>'), null, 'no og:image at all');

/* --------------------------------------------------------------- variant --- */

const SILK_SET = [
  `${UP}/2023/09/silkscreen-printing-300x199.jpg 300w`,
  `${UP}/2023/09/silkscreen-printing-1024x678.jpg 1024w`,
  `${UP}/2023/09/silkscreen-printing-768x509.jpg 768w`,
  `${UP}/2023/09/silkscreen-printing.jpg 1220w`,
].join(', ');

eq(thumbVariant(page({ url: `${UP}/2023/09/silkscreen-printing.jpg`, w: 1220, h: 808, srcset: SILK_SET }),
                `${UP}/2023/09/silkscreen-printing.jpg`),
   `${UP}/2023/09/silkscreen-printing-768x509.jpg`,
   'smallest variant at or above the thumbnail width');

eq(thumbVariant(page({ url: `${UP}/2024/04/laser_logo.jpg`, w: 300, h: 300 }),
                `${UP}/2024/04/laser_logo.jpg`),
   `${UP}/2024/04/laser_logo.jpg`,
   'no srcset: the original stands');

// The page's srcsets carry every other picture on it too, and one of those on
// this row would be somebody else's class photo.
eq(thumbVariant(page({ url: `${UP}/2026/03/angle.jpg`, w: 1220, h: 1220, srcset: SILK_SET }),
                `${UP}/2026/03/angle.jpg`),
   `${UP}/2026/03/angle.jpg`,
   'variants of a different image are ignored');

/* ------------------------------------------------------------ the picture --- */

eq(await eventImage(page({ url: `${UP}/2023/09/silkscreen-printing.jpg`, w: 1220, h: 808, srcset: SILK_SET }),
                    weighing(127502)),
   `${UP}/2023/09/silkscreen-printing-768x509.jpg`,
   'a photograph, served at thumbnail size');

// 300x300, and there are two of these on the calendar right now.
eq(await eventImage(page({ url: `${UP}/2024/04/laser_logo.jpg`, w: 300, h: 300 }), weighing(9690)),
   null, 'a studio badge is too small');

// The case size cannot catch: 768px and 1220px of flat artwork.
eq(await eventImage(page({ url: `${UP}/2021/07/tour_icon.jpg`, w: 768, h: 768 }), weighing(16746)),
   null, 'a full-size icon, caught by density (0.028)');
eq(await eventImage(page({ url: `${UP}/2022/01/Website-black-icons-20.png`, w: 1219, h: 1220 }), weighing(26568)),
   null, 'an icon sheet, caught by density (0.018)');

eq(await eventImage(page({ url: `${UP}/2026/03/angle.jpg`, w: 1220, h: 1220 }), weighing(146583)),
   `${UP}/2026/03/angle.jpg`, 'a photograph with no variants, kept whole');

// Yoast's emoji fallback, and anything else that is not a photograph file.
eq(await eventImage('<meta property="og:image" content="https://s.w.org/images/core/emoji/1f600.svg">', weighing(450)),
   null, 'the emoji fallback');
eq(await eventImage(page({ url: 'https://example.com/photo.jpg', w: 1220, h: 900 }), weighing(300000)),
   null, 'off-site images are never ours');
eq(await eventImage(page({ url: `${UP}/2020/01/cropped-Logo-final.png`, w: 1200, h: 1200 }), weighing(400000)),
   null, 'site chrome');

// A page whose markup moved: no stated width means no way to tell a badge from
// a photograph, so show nothing rather than guess.
eq(await eventImage('<meta property="og:image" content="https://seattlemakers.org/wp-content/uploads/a.jpg">',
                    weighing(200000)),
   null, 'no stated dimensions');

// And the deliberate leniency: unweighable is kept, because losing every
// thumbnail beats the occasional icon getting through.
eq(await eventImage(page({ url: `${UP}/2026/03/angle.jpg`, w: 1220, h: 1220 }), weighing(null)),
   `${UP}/2026/03/angle.jpg`, 'no content-length: kept');
eq(await eventImage(page({ url: `${UP}/2026/03/angle.jpg`, w: 1220, h: 1220 }),
                    async () => { throw new Error('network'); }),
   `${UP}/2026/03/angle.jpg`, 'HEAD failed outright: kept');

console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
