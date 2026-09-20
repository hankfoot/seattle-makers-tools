import type { APIRoute } from 'astro';

/**
 * A fake calendar for testing /today, in the real feed's shape.
 *
 * Why this exists: the real calendar usually has one or two things on, and both
 * are often a tour and an orientation, so a full board is hard to see. Point
 * the page at this with `/today?src=/events-dummy.json` and you get a busy day
 * with every state on screen at once - a cancelled class, a sold-out one, a
 * nearly-full one, a multi-part series, and - since the board became
 * time-aware - something finished, something running, and something next.
 *
 * The schedule is anchored to the build's clock rather than pinned to fixed
 * hours. Pinned times made the fixture useless for most of the day: built at
 * 09:00-19:00, it is a board of nothing but "finished" by the evening, which
 * is exactly when someone is most likely to be checking that the live states
 * work. Offsets keep one event running and one up next whenever you rebuild.
 *
 * Dates are generated at build time for *that* day, so this is always "today"
 * as of the last build rather than a fixture that rots. Rebuild and it moves.
 * That is also why it is an endpoint rather than a file in public/.
 *
 * Every row carries a real duration, and one of them is a multi-part series
 * whose `end` sits three weeks out with the session's clock time on it - which
 * is exactly how the real calendar encodes a course. Without that row the
 * fixture cannot exercise `sessionEnd`, and a board that treats a series as a
 * three-week-long live event looks fine against a fixture where every end is
 * null.
 */
const p2 = (n: number) => String(n).padStart(2, '0');

const BUILT = new Date();
const DAY = `${BUILT.getFullYear()}-${p2(BUILT.getMonth() + 1)}-${p2(BUILT.getDate())}`;

/**
 * Minutes since midnight, snapped to the previous half hour so the fixture
 * reads like a real timetable rather than "10:07".
 *
 * Clamped so the whole schedule fits inside one day. The rows span -300 to
 * +330 minutes and the longest runs 180 beyond its start, so an anchor outside
 * [300, 929] pushes rows past midnight - and clamping each row individually
 * instead just piles three of them onto 23:30 with ends reading "26:00". A
 * late-evening build therefore anchors at 15:00 rather than at the wall clock.
 * Something is always running as a result; a build after roughly 21:00 has
 * nothing left "up next", because the fixture's own last event has started by
 * then. Rebuild in the morning to see that state.
 */
const EARLIEST = -300;
const LATEST = 330;
const LONGEST = 180;
const ANCHOR =
  Math.floor(
    Math.max(
      -EARLIEST,
      Math.min(
        (BUILT.getHours() * 60 + BUILT.getMinutes()),
        23 * 60 + 59 - LATEST - LONGEST,
      ),
    ) / 30,
  ) * 30;

/** Anchor + offset as a clock time. */
function at(offsetMin: number): string {
  const m = ANCHOR + offsetMin;
  return `${p2(Math.floor(m / 60))}:${p2(m % 60)}`;
}

type Row = {
  /** Minutes relative to the anchor: negative is earlier today. */
  o: number;
  /** Minutes. The session's real length, not the series' span. */
  d: number;
  /** Days out that the feed's `end` date lands - a multi-part course. */
  seriesDays?: number;
  title: string;
  kinds: string[];
  /**
   * The calendar's own slugs, not our studio slugs - the woodshop is tagged
   * `woodworking` on the real feed, and data/studios maps it back. A fixture
   * carrying `woodshop` here resolves to no studio, so the dummy board would
   * be missing a label the production one shows.
   */
  categories: string[];
  available: number | null;
  soldOut?: boolean;
  summary?: string;
  /**
   * A picture, on half the rows - which is the proportion the live calendar
   * has. A fixture where every row had one would never show the mixed board
   * that /api/events actually produces, and the mix is the case the layout has
   * to survive: the picture column is `auto`, so a row without one gives its
   * width back to the words.
   *
   * These are local files under public/events/, left over from the reel, so
   * the fixture stays usable with no network - which is the whole point of
   * having one.
   */
  thumb?: string;
};

const ROWS: Row[] = [
  {
    o: -300,
    d: 180,
    title: 'Open Studio: Woodshop',
    kinds: ['guided-studio'],
    categories: ['woodworking'],
    available: 6,
    summary: 'Bench time with a monitor on the floor. Bring your own stock.',
  },
  {
    o: -210,
    d: 90,
    title: 'Laser Cutter Certification',
    kinds: ['certification'],
    categories: ['laser-cutting'],
    available: 2,
    summary: 'Required before booking the lasers. Ninety minutes, hands on.',
  },
  {
    o: -120,
    d: 60,
    title: 'Public Tour',
    kinds: ['tour'],
    categories: [],
    available: 15,
    summary: 'A walk through every studio. No booking needed.',
  },
  {
    o: -45,
    d: 120,
    title: '⚡Programmable LEDs',
    thumb: '/events/programmable-leds.jpg',
    kinds: ['class'],
    categories: ['electronics'],
    available: 3,
    summary: 'Wire up addressable strips and drive them from a microcontroller.',
  },
  {
    o: 45,
    d: 120,
    title: 'Intro to the Sewing Room',
    thumb: '/events/serger-coverstitch-certification-sewing.jpg',
    kinds: ['class'],
    categories: ['sewing'],
    available: 0,
    soldOut: true,
    summary: 'Machines, sergers, and what the room expects of you.',
  },
  {
    o: 150,
    d: 150,
    title: 'Ceramics Hand-building (CANCELLED)',
    thumb: '/events/intro-to-slip-casting.jpg',
    kinds: ['class'],
    categories: ['ceramics'],
    available: null,
    summary: 'Pinch, coil and slab. Clay included.',
  },
  {
    o: 240,
    d: 180,
    seriesDays: 21,
    title: 'Woodshop Basics (4 Part Series)',
    kinds: ['certification'],
    categories: ['woodworking'],
    available: 4,
    summary: 'Four evenings. The feed ends this three weeks out; only tonight runs.',
  },
  {
    o: 330,
    d: 120,
    title: 'Electronics & Robotics Meetup',
    thumb: '/events/electronics-and-robotics-meetup-guided-studio.jpg',
    kinds: ['meetup'],
    categories: ['electronics'],
    available: 20,
    summary: 'Bring a project or bring nothing. Free, members and guests.',
  },
];

/** Start + duration as a clock time, and the date the feed would stamp on it. */
function endOf(r: Row): string {
  const start = at(r.o);
  // Clamped: an end of "26:00" is not a time, and Date would silently roll it
  // into tomorrow rather than complain.
  const mins = Math.min(Number(start.slice(0, 2)) * 60 + Number(start.slice(3)) + r.d, 23 * 60 + 59);
  const clock = `${p2(Math.floor(mins / 60))}:${p2(mins % 60)}`;
  if (!r.seriesDays) return `${DAY}T${clock}`;
  const d = new Date(`${DAY}T00:00:00`);
  d.setDate(d.getDate() + r.seriesDays);
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}T${clock}`;
}

const events = ROWS.map((r, i) => ({
  id: 900000 + i,
  title: r.title,
  url: 'https://seattlemakers.org/events/',
  start: `${DAY}T${at(r.o)}`,
  end: endOf(r),
  endTs: Math.floor(new Date(`${endOf(r)}:00`).getTime() / 1000),
  available: r.available,
  soldOut: Boolean(r.soldOut),
  kinds: r.kinds,
  categories: r.categories,
  summary: r.summary,
  thumb: r.thumb,
  checked: true,
}));

export const GET: APIRoute = () =>
  new Response(
    JSON.stringify({
      source: 'dummy fixture for testing /today',
      fetchedAt: new Date().toISOString(),
      count: events.length,
      events,
    }),
    { headers: { 'content-type': 'application/json; charset=utf-8' } },
  );
