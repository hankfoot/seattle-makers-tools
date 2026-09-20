/**
 * What the tools are called and what they do - defined once.
 *
 * Each of these strings used to exist three times: on the index card, in the
 * page's own subtitle, and in its `<meta name="description">`. They had drifted
 * into three different answers per tool - the label maker's card said "Create
 * custom labels and QR codes to print on sticker paper", its page said "One
 * design, printed onto the sheet you choose", and search engines were told
 * "Design a label and print it onto the Label Station's sheets". All three were
 * true and none of them matched.
 *
 * Nothing enforced that they agree, so they did not. Now the card, the page and
 * the meta tag all read the same constant, and parity is a property of the code
 * rather than something to remember during a rename.
 */

export type Tool = {
  /** Stable key for `toolById`. Not user-visible, and not the URL. */
  id: 'today' | 'labels';
  name: string;
  /** Path. Deliberately unchanged by renames: /labels encodes a saved label
      design in its query string, so old bookmarks must keep working. */
  href: string;
  /** One sentence, used verbatim in all three places. */
  blurb: string;
};

export const SITE = {
  name: 'Seattle Makers Digital Toolbox',
  blurb: 'A handy collection of web tools to help out around the makerspace',
  /** Suffix for tool-page titles. The index needs none - its name already
      carries the organisation. */
  org: 'Seattle Makers',
} as const;

export const TOOLS: Tool[] = [
  // Parked while the today board is built out. The page and its runtime are
  // untouched and /slideshow still serves - this only takes it off the index.
  // {
  //   id: 'slideshow',
  //   name: 'Slideshow',
  //   href: '/slideshow',
  //   blurb: 'A looping reel of studio photos and upcoming classes, for markets and tabling events.',
  // },
  {
    id: 'today',
    name: 'Daily Events',
    href: '/today',
    blurb: "Show off what's happening at the makerspace on a dedicated display.",
  },
  {
    id: 'labels',
    name: 'Label Generator',
    href: '/labels',
    blurb: 'Create custom labels and QR codes to print on sticker paper.',
  },
];

/** Throws rather than returning undefined: a typo'd id should fail the build,
    not ship a page with an empty title. */
export function toolById(id: Tool['id']): Tool {
  const found = TOOLS.find((t) => t.id === id);
  if (!found) throw new Error(`tools.ts: no tool with id "${id}"`);
  return found;
}

/** "Daily Events — Seattle Makers" */
export function pageTitle(tool: Tool): string {
  return `${tool.name} — ${SITE.org}`;
}
