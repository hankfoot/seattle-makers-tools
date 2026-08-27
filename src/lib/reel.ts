import { pickByStudio, type SmEvent } from './events';
import { studiosWithPhotos, photosFor } from './photos';
import type { Studio } from '../data/studios';

export type Slide =
  | { type: 'brand' }
  | { type: 'photo'; studio: Studio; src: string }
  | { type: 'event'; studio: Studio; events: SmEvent[]; photo: string | null };

/**
 * Build the loop, following the rhythm of the brand deck:
 *
 *   brand card -> three photos of one studio -> an upcoming class -> repeat
 *
 * Two departures from the deck, both because the data outgrew it:
 *
 * - Studios with events but no photos yet (ceramics and screen printing are the
 *   busiest studios on the calendar) still get event cards. Tying event cards
 *   to photo blocks would silently hide the most active parts of the space.
 * - Event cards are distributed across the blocks rather than one per block, so
 *   every studio's pick appears once per loop however many photo blocks exist.
 */
/**
 * Photos shown per studio per loop. The deck used three, but that was across
 * six studios; at twelve it makes the loop long enough that a passer-by waits
 * too long for the events to come round again.
 */
const PHOTOS_PER_STUDIO = 2;

/**
 * Show the brand card at the top of every Nth studio block.
 *
 * The deck put one before every block, but that was six studios. Once ten have
 * photos, one-per-block means the same card roughly every half minute, which
 * reads as a stutter rather than a spine. Every third block puts it on screen
 * about once a minute.
 */
const BRAND_EVERY = 3;

export function buildReel(opts: { now?: string; maxPhotos?: number } = {}): Slide[] {
  const { maxPhotos = PHOTOS_PER_STUDIO } = opts;

  const blocks = studiosWithPhotos();
  const picks = pickByStudio({ now: opts.now }).filter((p) => p.events.length > 0);

  const eventSlides: Slide[] = picks.map(({ studio, events }) => {
    const own = photosFor(studio.slug);
    return {
      type: 'event',
      studio,
      events,
      // No photos for this studio yet - the card falls back to the studio icon
      // on a tinted panel, which reads as deliberate rather than broken.
      photo: own.length ? own[own.length - 1] : null,
    };
  });

  if (blocks.length === 0) {
    return [{ type: 'brand' }, ...eventSlides];
  }

  // Spread the event cards evenly across the loop rather than filling from the
  // front - otherwise, with fewer events than studios, every event lands in the
  // first half and the reel tails off into photos.
  const perBlock: Slide[][] = blocks.map(() => []);
  eventSlides.forEach((slide, j) => {
    const at = Math.min(blocks.length - 1, Math.floor((j * blocks.length) / eventSlides.length));
    perBlock[at].push(slide);
  });

  const slides: Slide[] = [];
  blocks.forEach(({ studio, photos }, i) => {
    if (i % BRAND_EVERY === 0) slides.push({ type: 'brand' });
    for (const src of photos.slice(0, maxPhotos)) slides.push({ type: 'photo', studio, src });
    slides.push(...perBlock[i]);
  });

  return slides;
}
