import { pickByStudio, type SmEvent } from './events';
import { studiosWithPhotos } from './photos';
import type { Studio } from '../data/studios';

export type Slide =
  | { type: 'brand' }
  | { type: 'photo'; studio: Studio; src: string }
  | { type: 'event'; studio: Studio; events: SmEvent[] };

/**
 * Photos shown per studio per loop. The deck used three, but that was across
 * six studios; at eleven it makes the loop long enough that a passer-by waits
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

/**
 * Build the loop, following the rhythm of the brand deck:
 *
 *   brand card -> photos of one studio -> that studio's next class -> repeat
 *
 * Pairing each event card with its own studio's photos is the point: the class
 * being advertised is for the room you were just looking at. A studio with a
 * class on but no photos yet still gets its card, appended after the blocks,
 * rather than losing the airtime.
 *
 * The brand card leads every third block rather than every one. The deck put it
 * before each of six; at eleven studios that is the same card roughly every
 * half minute, which reads as a stutter rather than a spine.
 */
export function buildReel(opts: { now?: string; maxPhotos?: number } = {}): Slide[] {
  const { maxPhotos = PHOTOS_PER_STUDIO } = opts;

  const blocks = studiosWithPhotos();
  const cardFor = new Map<string, Slide>();
  for (const { studio, events } of pickByStudio({ now: opts.now })) {
    if (events.length) cardFor.set(studio.slug, { type: 'event', studio, events });
  }

  const slides: Slide[] = [];
  blocks.forEach(({ studio, photos }, i) => {
    if (i % BRAND_EVERY === 0) slides.push({ type: 'brand' });
    for (const src of photos.slice(0, maxPhotos)) slides.push({ type: 'photo', studio, src });
    const card = cardFor.get(studio.slug);
    if (card) {
      slides.push(card);
      cardFor.delete(studio.slug);
    }
  });

  // Studios with a class on but no photos yet still deserve the airtime.
  const orphans = [...cardFor.values()];
  if (slides.length === 0) slides.push({ type: 'brand' });
  slides.push(...orphans);

  return slides;
}
