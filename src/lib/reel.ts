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
export function buildReel(opts: { now?: string; maxPhotos?: number } = {}): Slide[] {
  const { maxPhotos = 3 } = opts;

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

  // Spread the event cards over the photo blocks as evenly as they divide.
  const per = Math.floor(eventSlides.length / blocks.length);
  const extra = eventSlides.length % blocks.length;

  const slides: Slide[] = [];
  let cursor = 0;
  blocks.forEach(({ studio, photos }, i) => {
    slides.push({ type: 'brand' });
    for (const src of photos.slice(0, maxPhotos)) slides.push({ type: 'photo', studio, src });
    const take = per + (i < extra ? 1 : 0);
    slides.push(...eventSlides.slice(cursor, cursor + take));
    cursor += take;
  });
  slides.push(...eventSlides.slice(cursor));

  return slides;
}
