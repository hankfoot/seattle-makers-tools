import raw from '../data/events.json';
import { STUDIOS, studiosForCategories, type Studio } from '../data/studios';

export type SmEvent = {
  id: number;
  title: string;
  url: string;
  /** Floating local time, "2026-09-05T13:00". Never a UTC instant. */
  start: string;
  end: string | null;
  endTs: number | null;
  available: number | null;
  soldOut: boolean;
  kinds: string[];
  categories: string[];
  summary?: string;
  /** Local path to the event's own picture, when its page had one big enough. */
  image?: string;
  /** The event page was fetched; absence of summary/image is a fact, not a gap. */
  checked?: boolean;
};

export const EVENTS = raw.events as SmEvent[];
export const FETCHED_AT = raw.fetchedAt as string;

/**
 * Operational scheduling, not programming worth putting on a market display:
 * open studio hours, building tours, and new-member orientations.
 */
const HIDDEN_KINDS = new Set(['guided-studio', 'tour', 'orientation']);

/**
 * Organisers mark a scrapped class by editing its title rather than removing
 * the event, so "(CANCELLED)" is the only signal there is.
 */
const CANCELLED = /\bcancell?ed\b/i;

/**
 * Preference order within a studio. Classes are the thing to advertise to a
 * stranger at a market - a certification only means something once you already
 * intend to use the space.
 */
const KIND_RANK = ['class', 'certification', 'meetup'];

function rank(e: SmEvent): number {
  let best = KIND_RANK.length;
  for (const k of e.kinds) {
    const i = KIND_RANK.indexOf(k);
    if (i !== -1 && i < best) best = i;
  }
  return best;
}

/** Floating-local "now", in the same shape as `start`, so string compare works. */
export function localNow(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}:00`);
  d.setDate(d.getDate() + days);
  return localNow(d);
}

export type StudioPick = { studio: Studio; events: SmEvent[] };

/**
 * One studio, one slot in the reel - and within a studio the best *kind* of
 * event wins before soonest does, so a class next month beats a certification
 * tomorrow. The tier is chosen from what falls inside `windowDays`; if a studio
 * has nothing that soon, the whole upcoming range is considered rather than
 * dropping the studio.
 *
 * Returns up to `perStudio` occurrences so the page keeps working as it ages:
 * the browser drops any that have since passed and shows the next one, which
 * means a build from a fortnight ago still puts a real date on screen.
 */
export function pickByStudio({
  now = localNow(),
  windowDays = 120,
  perStudio = 3,
}: { now?: string; windowDays?: number; perStudio?: number } = {}): StudioPick[] {
  const horizon = addDays(now, windowDays);
  const upcoming = EVENTS.filter(
    (e) =>
      e.start >= now &&
      !e.soldOut &&
      !CANCELLED.test(e.title) &&
      !e.kinds.some((k) => HIDDEN_KINDS.has(k)),
  );

  const byStudio = new Map<string, SmEvent[]>();
  for (const e of upcoming) {
    for (const s of studiosForCategories(e.categories)) {
      byStudio.set(s.slug, [...(byStudio.get(s.slug) ?? []), e]);
    }
  }

  const picks: StudioPick[] = [];
  for (const studio of STUDIOS) {
    const all = (byStudio.get(studio.slug) ?? []).sort((a, b) => a.start.localeCompare(b.start));
    if (all.length === 0) continue;

    const soon = all.filter((e) => e.start <= horizon);
    const pool = soon.length ? soon : all;
    const bestTier = Math.min(...pool.map(rank));
    const tiered = pool.filter((e) => rank(e) === bestTier);

    // Same class, several occurrences: keep the soonest of each distinct title
    // so the fallbacks are genuinely different events, not the same one twice.
    const seen = new Set<string>();
    const distinct = tiered.filter((e) => !seen.has(e.title) && seen.add(e.title));

    // An editorial pick from studios.ts takes the slot outright, whatever its
    // tier or date - but only while it is genuinely upcoming, so a stale
    // override quietly stops applying instead of emptying the studio's card.
    if (studio.preferEvent) {
      const wanted = studio.preferEvent.toLowerCase();
      const favourite = all.find((e) => e.title.toLowerCase().includes(wanted));
      if (favourite) {
        const rest = distinct.filter((e) => e.title !== favourite.title);
        picks.push({ studio, events: [favourite, ...rest].slice(0, perStudio) });
        continue;
      }
    }

    picks.push({ studio, events: distinct.slice(0, perStudio) });
  }
  return picks;
}

const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/** "2026-09-05T13:00" -> { day: "sat sep 5", time: "1:00 pm" } */
export function formatWhen(iso: string): { day: string; time: string } {
  const d = new Date(`${iso}:00`);
  const h = d.getHours();
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  const mins = String(d.getMinutes()).padStart(2, '0');
  return {
    day: `${DAYS[d.getDay()]} ${MONTHS[d.getMonth()]} ${d.getDate()}`,
    time: `${hour12}:${mins} ${h < 12 ? 'am' : 'pm'}`,
  };
}

/** "2026-09-19T14:00" -> "2026-09-19". Floating-local throughout; see above. */
export function localDay(d = new Date()): string {
  return localNow(d).slice(0, 10);
}

/**
 * Everything on the calendar for one day, soonest first.
 *
 * Deliberately unfiltered, unlike `pickByStudio`. The reel hides tours, open
 * studio hours and orientations because they are operational scheduling rather
 * than programming worth advertising to a stranger at a market. A board inside
 * the space is the opposite case: those are exactly what someone standing in
 * the doorway wants to know about, and on a typical day they are most of what
 * is on. Today (19 Sep) is a public tour and a new-member orientation and
 * nothing else, so filtering them would leave the board empty.
 *
 * Cancelled classes stay in, marked, rather than vanishing - someone who came
 * for one needs to see that it is off, not find no trace of it.
 */
export function eventsOn(day: string, events: SmEvent[] = EVENTS): SmEvent[] {
  return events
    .filter((e) => e.start.slice(0, 10) === day)
    .sort((a, b) => a.start.localeCompare(b.start));
}

/** Organisers signal a scrapped class in the title; expose that to the board. */
export function isCancelled(e: SmEvent): boolean {
  return CANCELLED.test(e.title);
}

/** The label under the time: what kind of thing this is. */
export function kindLabel(e: SmEvent): string {
  const map: Record<string, string> = {
    class: 'class',
    certification: 'certification',
    meetup: 'meetup',
    'guided-studio': 'open studio',
    tour: 'tour',
    orientation: 'orientation',
  };
  for (const k of e.kinds) if (map[k]) return map[k];
  return 'event';
}
