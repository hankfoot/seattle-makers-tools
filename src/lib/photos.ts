import { readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { STUDIOS, type Studio } from '../data/studios';

/**
 * Studio photos are discovered from the filesystem at build time rather than
 * listed in code, so adding a studio's photos is just dropping files into
 * public/studios/<slug>/ - no edit here, no import to remember.
 */
const ROOT = resolve(process.cwd(), 'public/studios');
const IMAGE = /\.(jpe?g|png|webp|avif)$/i;

export function photosFor(slug: string): string[] {
  const dir = resolve(ROOT, slug);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => IMAGE.test(f) && !f.startsWith('.'))
    .sort()
    .map((f) => `/studios/${slug}/${f}`);
}

export type StudioPhotos = { studio: Studio; photos: string[] };

/** Studios that actually have photos, in the order declared in studios.ts. */
export function studiosWithPhotos(): StudioPhotos[] {
  return STUDIOS.map((studio) => ({ studio, photos: photosFor(studio.slug) })).filter(
    (s) => s.photos.length > 0,
  );
}
