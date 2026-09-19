import type { APIRoute } from 'astro';

/**
 * A fake calendar for testing /today, in the real feed's shape.
 *
 * Why this exists: the real calendar usually has one or two things on, and both
 * are often a tour and an orientation, so a full board is hard to see. Point
 * the page at this with `/today?src=/events-dummy.json` and you get a busy day
 * with every state on screen at once - a cancelled class, a sold-out one, a
 * nearly-full one, an all-day-ish span, one with no picture.
 *
 * Dates are generated at build time for *that* day, so this is always "today"
 * as of the last build rather than a fixture that rots. Rebuild and it moves.
 * That is also why it is an endpoint rather than a file in public/.
 */
const DAY = (() => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
})();

type Row = {
  t: string;
  title: string;
  kinds: string[];
  categories: string[];
  available: number | null;
  soldOut?: boolean;
  summary?: string;
};

const ROWS: Row[] = [
  {
    t: '09:00',
    title: 'Open Studio: Woodshop',
    kinds: ['guided-studio'],
    categories: ['woodshop'],
    available: 6,
    summary: 'Bench time with a monitor on the floor. Bring your own stock.',
  },
  {
    t: '10:30',
    title: 'Laser Cutter Certification',
    kinds: ['certification'],
    categories: ['laser-cutting'],
    available: 2,
    summary: 'Required before booking the lasers. Ninety minutes, hands on.',
  },
  {
    t: '12:00',
    title: 'Public Tour',
    kinds: ['tour'],
    categories: [],
    available: 15,
    summary: 'A walk through every studio. No booking needed.',
  },
  {
    t: '13:00',
    title: '⚡Programmable LEDs',
    kinds: ['class'],
    categories: ['electronics'],
    available: 3,
    summary: 'Wire up addressable strips and drive them from a microcontroller.',
  },
  {
    t: '15:00',
    title: 'Intro to the Sewing Room',
    kinds: ['class'],
    categories: ['sewing'],
    available: 0,
    soldOut: true,
    summary: 'Machines, sergers, and what the room expects of you.',
  },
  {
    t: '17:30',
    title: 'Ceramics Hand-building (CANCELLED)',
    kinds: ['class'],
    categories: ['ceramics'],
    available: null,
    summary: 'Pinch, coil and slab. Clay included.',
  },
  {
    t: '19:00',
    title: 'Electronics & Robotics Meetup',
    kinds: ['meetup'],
    categories: ['electronics'],
    available: 20,
    summary: 'Bring a project or bring nothing. Free, members and guests.',
  },
];

const events = ROWS.map((r, i) => ({
  id: 900000 + i,
  title: r.title,
  url: 'https://seattlemakers.org/events/',
  start: `${DAY}T${r.t}`,
  end: null,
  endTs: null,
  available: r.available,
  soldOut: Boolean(r.soldOut),
  kinds: r.kinds,
  categories: r.categories,
  summary: r.summary,
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
