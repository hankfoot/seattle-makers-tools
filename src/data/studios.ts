/**
 * The studio list. Single source of truth for the reel.
 *
 * ADDING A STUDIO
 *   1. drop photos in  public/studios/<slug>/*.jpg   (1920px+ wide, landscape)
 *   2. drop an icon at public/brand/icons/<slug>.(png|svg)
 *   3. add an entry below
 * Nothing else needs to change.
 *
 * `eventCategories` maps the raw category slugs the calendar puts on each event
 * anchor onto this studio. The mapping is deliberately many-to-one: the site
 * emits both `cnc` and `cnc-routing` for one studio, and tags some leatherwork
 * classes `leatherworking-sewing`, which is not a studio of its own.
 *
 * The slugs `cosplay`, `design` and `crafts` appear on events but are topical
 * tags rather than studios, so they are absent here on purpose - an event
 * carrying only those resolves to no studio and produces no card.
 */
export type Studio = {
  slug: string;
  /** Display name. Lowercase throughout, matching the brand deck's chips. */
  name: string;
  icon: string;
  /** Raw calendar category slugs that resolve to this studio. */
  eventCategories: string[];
  /**
   * Editorial override: case-insensitive substring of the event title to
   * feature for this studio when it is upcoming. Use it when the automatic
   * pick is defensible but a different class sells the studio better - the
   * ranking cannot know that "Programmable LEDs" is a more enticing shop
   * window than "Soldering 101" when both are classes.
   */
  preferEvent?: string;
};

export const STUDIOS: Studio[] = [
  { slug: 'laser-cutting',   name: 'laser cutting',   icon: '/brand/icons/laser-cutting.png',   eventCategories: ['laser-cutting'] },
  { slug: '3d-printing',     name: '3d printing',     icon: '/brand/icons/3d-printing.png',     eventCategories: ['3d-printing'] },
  { slug: 'woodshop',        name: 'woodshop',        icon: '/brand/icons/woodshop.png',        eventCategories: ['woodworking'] },
  { slug: 'sewing',          name: 'sewing',          icon: '/brand/icons/sewing.png',          eventCategories: ['sewing'] },
  { slug: 'electronics',     name: 'electronics',     icon: '/brand/icons/electronics.png',     eventCategories: ['electronics'], preferEvent: 'Programmable LEDs' },
  { slug: 'cnc',             name: 'cnc',             icon: '/brand/icons/cnc.png',             eventCategories: ['cnc', 'cnc-routing'] },
  { slug: 'ceramics',        name: 'ceramics',        icon: '/brand/icons/ceramics.svg',        eventCategories: ['ceramics'] },
  { slug: 'screen-printing', name: 'screen printing', icon: '/brand/icons/screen-printing.svg', eventCategories: ['print-making'] },
  { slug: 'leatherworking',  name: 'leatherworking',  icon: '/brand/icons/leatherworking.svg',  eventCategories: ['leatherworking', 'leatherworking-sewing'] },
  { slug: 'metalworking',    name: 'metalworking',    icon: '/brand/icons/metalworking.png',    eventCategories: [] },
  { slug: 'av-studio',       name: 'a/v studio',      icon: '/brand/icons/av-studio.png',       eventCategories: [] },
];

export const STUDIO_BY_SLUG = new Map(STUDIOS.map((s) => [s.slug, s]));

/** Raw calendar category slug -> studio slug. */
const CATEGORY_TO_STUDIO = new Map<string, string>(
  STUDIOS.flatMap((s) => s.eventCategories.map((c) => [c, s.slug] as [string, string])),
);

/** Studios an event belongs to. Empty when it carries only topical tags. */
export function studiosForCategories(categories: string[]): Studio[] {
  const slugs = new Set<string>();
  for (const c of categories) {
    const slug = CATEGORY_TO_STUDIO.get(c);
    if (slug) slugs.add(slug);
  }
  return [...slugs].map((s) => STUDIO_BY_SLUG.get(s)!).filter(Boolean);
}
