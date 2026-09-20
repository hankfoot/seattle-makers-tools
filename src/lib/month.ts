/**
 * Months, weeks and the small bits of text a printed calendar needs.
 *
 * Deliberately free of any data import, for the same reason `lib/day-status.ts`
 * is: `lib/events.ts` is not free to import from a browser bundle, and these
 * are pure functions over strings and numbers. `npm test` covers them without a
 * DOM, a fixture or a network.
 *
 * Times and dates are floating-local strings ("2026-09-05T18:30",
 * "2026-09-05") throughout, matching the feed. The calendar publishes
 * wall-clock Seattle time and the poster is printed in Seattle, so there is no
 * conversion to do and plain string comparison sorts correctly. See the note at
 * the top of lib/events.ts.
 */

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Sunday-first, matching every wall calendar in the building. */
export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const p2 = (n: number) => String(n).padStart(2, '0');

/** "2026-09" for a Date, in local time. */
export function monthKey(d = new Date()): string {
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}`;
}

/** "2026-09" -> "September 2026". */
export function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

/** "2026-09" -> "September". The year lives elsewhere on the poster. */
export function monthName(key: string): string {
  return MONTH_NAMES[Number(key.slice(5, 7)) - 1]!;
}

/** "2026-12" + 1 -> "2027-01". Rolls the year, forwards and backwards. */
export function shiftMonth(key: string, by: number): string {
  const [y, m] = key.split('-').map(Number);
  // Date normalises out-of-range months, including negative ones, so this
  // needs no modular arithmetic of its own.
  const d = new Date(y!, m! - 1 + by, 1);
  return monthKey(d);
}

/** Local "YYYY-MM-DD" for a Date. Never a UTC instant; see the header. */
export function isoDay(d: Date): string {
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
}

/**
 * The month laid out as whole weeks of "YYYY-MM-DD", Sunday first.
 *
 * Five rows or six, never a fixed six: a month that fits in five gets taller
 * cells rather than a blank row at the bottom, which on a door poster is the
 * difference between a calendar and a calendar with a hole in it. February
 * starting on a Sunday in a non-leap year is the one case that fits in four,
 * and it falls out of the same arithmetic.
 *
 * Dates are built with `new Date(y, m, d)` and read back with local getters, so
 * the leading and trailing days from the neighbouring months come out right
 * across a year boundary. DST is not a hazard here - US transitions happen at
 * 2am, so local midnight is never the skipped hour.
 */
export function monthGrid(key: string): string[][] {
  const [y, m] = key.split('-').map(Number);
  const lead = new Date(y!, m! - 1, 1).getDay();
  // Day 0 of the next month is the last day of this one.
  const total = new Date(y!, m!, 0).getDate();
  const weeks: string[][] = [];
  for (let i = 0; i < Math.ceil((lead + total) / 7) * 7; i++) {
    if (i % 7 === 0) weeks.push([]);
    weeks[weeks.length - 1]!.push(isoDay(new Date(y!, m! - 1, 1 - lead + i)));
  }
  return weeks;
}

/** Whether a "YYYY-MM-DD" belongs to the month, rather than to a neighbour. */
export function inMonth(day: string, key: string): boolean {
  return day.startsWith(key);
}

/**
 * "2026-09-05T18:30" -> "6:30pm", "2026-09-05T18:00" -> "6pm".
 *
 * The minutes are dropped when there are none because a grid cell is about an
 * inch wide: ":00" is a fifth of the line, repeated down the whole poster, and
 * it says nothing. Lowercase and unspaced for the same reason.
 */
export function compactTime(iso: string): string {
  const h = Number(iso.slice(11, 13));
  const mins = iso.slice(14, 16);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const suffix = h < 12 ? 'am' : 'pm';
  return mins === '00' ? `${h12}${suffix}` : `${h12}:${mins}${suffix}`;
}

/**
 * Emoji the organisers put in event titles - "🪚 Woodshop Guided Studio",
 * "🏺 Ceramics Guided Studio", "🎃 Costume Making … 🎃".
 *
 * They are stripped for print. A cell is about an inch wide, an emoji is a full
 * character of it, and the poster already carries the studio's own icon at
 * twenty times the size. They also print unpredictably: a colour emoji font is
 * the one face on the page that is not self-hosted, so what lands on paper
 * depends on the machine rather than on this repo.
 *
 * Leading and trailing only - one in the middle of a title is doing work.
 */
const DECOR = String.raw`[\p{Extended_Pictographic}️‍\u{1F3FB}-\u{1F3FF}]`;
const LEADING = new RegExp(`^(?:${DECOR}\\s*)+`, 'u');
const TRAILING = new RegExp(`(?:\\s*${DECOR})+$`, 'u');

/**
 * The title as it should read on the poster.
 *
 * `studioName` additionally strips a redundant "Sewing: " prefix - the poster
 * is headed with the studio's name in 30pt, so repeating it inside a
 * one-inch-wide cell costs a whole line to say nothing.
 *
 * **Colon-delimited only, and that is the whole rule.** Matching the bare name
 * as well would turn "Screen Printing Certification" into "Certification",
 * which on a poster listing three kinds of session is genuinely ambiguous, and
 * "Woodshop Basics (4 Part Series)" into "Basics". Checked against the whole
 * calendar: the colon form rewrites the two "Sewing: …" rows and leaves every
 * other title byte-identical. "Big CNC: Industrial 4′ x 10′ …" is safe because
 * the prefix is "Big CNC", not the studio's name.
 */
export function displayTitle(raw: string, studioName?: string): string {
  let t = raw.replace(LEADING, '').replace(TRAILING, '').trim();
  if (studioName) {
    const prefix = `${studioName.toLowerCase()}:`;
    if (t.toLowerCase().startsWith(prefix)) t = t.slice(prefix.length).trim();
  }
  return t;
}
