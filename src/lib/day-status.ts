/**
 * Where a day's events stand relative to right now.
 *
 * Deliberately free of any data import. `lib/events.ts` pulls events.json -
 * 72K - so `scripts/today.ts` cannot touch it without dragging the whole
 * calendar into the browser bundle, which is precisely what the live fetch
 * exists to avoid. These are pure functions over strings and numbers, so the
 * build-time render and the runtime re-render can share one implementation
 * instead of keeping two copies of the same rules in step by hand.
 *
 * Times are floating-local strings ("2026-09-19T14:00") throughout, matching
 * the feed. See the note in lib/events.ts: the calendar publishes wall-clock
 * Seattle time and the screen runs in Seattle, so there is no conversion to do
 * and plain string comparison sorts correctly.
 */

export type Status = 'past' | 'live' | 'next' | 'later';

/** Minimal shape this module needs; the real SmEvent has much more. */
export type Timed = { start: string; end?: string | null };

/** Fallback when an end is missing or unusable. The calendar's median is 2.5h,
    but under-running is safer than over: a session shown as finished when it is
    still going is a smaller lie than one shown as live an hour after it ended. */
const DEFAULT_MINUTES = 120;

const p2 = (n: number) => String(n).padStart(2, '0');

/** Local wall clock as a floating string, the same shape as the feed. */
export function nowLocal(d = new Date()): string {
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}T${p2(d.getHours())}:${p2(d.getMinutes())}`;
}

/** Minutes since midnight for the time part of a floating string. */
function minutesOfDay(iso: string): number {
  return Number(iso.slice(11, 13)) * 60 + Number(iso.slice(14, 16));
}

/**
 * When today's session of an event actually ends.
 *
 * **The feed's `end` is not the session's end for multi-part courses.** A "4
 * Part Series" carries the end of the *last* session, weeks out - "Woodshop
 * Basics" runs 2026-09-09T18:30 -> 2026-09-30T21:30. Taken literally that
 * event is "on now" for three weeks and owns the top of the board every day.
 *
 * The clock time survives, though: 18:30 -> 21:30 is the real three-hour
 * session, just stamped with the series' final date. Checked against the whole
 * calendar - all 8 multi-day rows imply a sane 2-3h session that way, and the
 * one with a same-title single-day twin ("CNC Certification Series") implies
 * 2.0h against a twin that runs exactly 2.0h.
 *
 * So: take the end's clock time, put it on the start's date. If that lands at
 * or before the start - a session crossing midnight, which nothing in the
 * calendar currently does - fall back to a fixed duration rather than invent a
 * negative one.
 */
export function sessionEnd(start: string, end?: string | null): string {
  const day = start.slice(0, 10);
  if (end) {
    const candidate = `${day}T${end.slice(11, 16)}`;
    if (minutesOfDay(candidate) > minutesOfDay(start)) return candidate;
  }
  const mins = minutesOfDay(start) + DEFAULT_MINUTES;
  // Clamp rather than roll over: a board only ever shows one day.
  const capped = Math.min(mins, 23 * 60 + 59);
  return `${day}T${p2(Math.floor(capped / 60))}:${p2(capped % 60)}`;
}

/**
 * Tag each event with where it stands. Exactly one gets `next` - the soonest
 * that has not started - so "up next" means one thing on screen rather than
 * being a synonym for "not yet".
 *
 * Returns a parallel array of statuses rather than mutating, so the caller can
 * keep whatever event objects it already has.
 *
 * **`off` is what stops the board advertising a class that is not happening.**
 * A cancelled event still has a start and an end, so without it the clock
 * alone decides: the cancelled ceramics class at 17:30 came out `next` at
 * 17:10 - a feature plate that grows a "Starting soon" pill telling somebody
 * to walk to a room - and came out `live` at 18:00, with "On now" and a
 * progress bar running through a session nobody is in. Both were true of the
 * calendar as it stands today.
 *
 * So a cancelled event is never running and is never what is next. It keeps
 * its place in the day - `past` once its slot has been and gone, `later`
 * before that - because somebody who turned up for it still has to find it on
 * the board. It just cannot be the thing the board points at.
 *
 * Passed in rather than detected here, because what makes an event cancelled
 * is a string in its title and this module deliberately knows nothing about
 * the shape of an event beyond its two times.
 */
export function statuses<T extends Timed>(
  events: T[],
  now: string,
  off: (e: T) => boolean = () => false,
): Status[] {
  const out: Status[] = events.map((e) => {
    const ended = sessionEnd(e.start, e.end) <= now;
    if (off(e)) return ended ? 'past' : 'later';
    return ended ? 'past' : e.start <= now ? 'live' : 'later';
  });
  // Soonest future start, by the array's own order - the caller sorts - and
  // skipping anything cancelled, which would otherwise take the one slot.
  const upNext = out.findIndex((st, i) => st === 'later' && !off(events[i]!));
  if (upNext !== -1) out[upNext] = 'next';
  return out;
}

/**
 * How close a class has to be before the board calls it starting soon.
 *
 * Thirty minutes is about the point where the label is an instruction rather
 * than a fact - close enough that somebody reading the board should start
 * walking to the room. Further out, `.t-note` already says "starts in 4h",
 * which is the honest version of the same information.
 */
export const SOON_MINUTES = 30;

/**
 * Whether the next class is close enough to be worth chasing.
 *
 * Only ever asked of a `next` row, which by construction has not started -
 * `statuses()` calls anything at or past its start `live` - so the gap is
 * always positive and the badge cannot appear on something already running.
 *
 * Minutes-of-day is safe here because the board only ever shows one day: both
 * arguments come from the same render, against the same date.
 */
export function startingSoon(start: string, now: string): boolean {
  return minutesOfDay(start) - minutesOfDay(now) <= SOON_MINUTES;
}

/** 0-100, how far through a live session we are. */
export function progress(start: string, end: string, now: string): number {
  const a = minutesOfDay(start);
  const b = minutesOfDay(end);
  const n = minutesOfDay(now);
  if (b <= a) return 0;
  return Math.max(0, Math.min(100, ((n - a) / (b - a)) * 100));
}

/** "1h 12m" / "48m". Empty when the gap is under a minute. */
export function gap(fromIso: string, toIso: string): string {
  const mins = minutesOfDay(toIso) - minutesOfDay(fromIso);
  if (mins < 1) return '';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * "2:00" and "pm", separately.
 *
 * The board sets the two at different sizes - the hour big and tabular, the
 * meridiem small and tracked - because nobody standing in front of a board
 * checks whether a class at 2:15 is in the morning, and setting both the same
 * size spends the time column's whole presence on the half of it that is never
 * read. Splitting it here rather than in the renderer keeps every time on the
 * board coming out of one place.
 */
export function clockParts(iso: string): { hour: string; meridiem: string } {
  const h = Number(iso.slice(11, 13));
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return { hour: `${h12}:${iso.slice(14, 16)}`, meridiem: h < 12 ? 'am' : 'pm' };
}

/** "2:00 pm" from a floating local string. Still what the hero clock wants. */
export function clock(iso: string): string {
  const { hour, meridiem } = clockParts(iso);
  return `${hour} ${meridiem}`;
}

/**
 * The line under a row's description: what is happening, and how long it has.
 *
 * It carries the state in words now - "On now", "Starting in" - where the
 * board used to put a pill in the time block beside the clock. That was the
 * same fact in two places, and the time block is for the time.
 *
 * **A row gets one only when there is something to act on**, which is exactly
 * the two states the board elevates: running, or starting inside the half
 * hour. Everything else returns empty and stays condensed.
 *
 * That correspondence is deliberate and load-bearing - `scripts/today.ts`
 * raises a row's tier on `note !== ''` rather than keeping a second rule in
 * step with this one. A class six hours out therefore shows no countdown at
 * all: "starts in 6h" is a fact about the schedule, not a thing to do, and
 * `.t-time` already says when it is.
 *
 * A finished class says nothing either. It used to say "finished", which was a
 * fourth way of saying what the greyed plate, the passed time and the position
 * above the running row already say.
 */
export function statusNote(status: Status, start: string, end: string, now: string): string {
  if (status === 'live') {
    const left = gap(now, end);
    return left ? `On now · ${left} left` : 'Finishing now';
  }
  if (status === 'next' && startingSoon(start, now)) {
    const until = gap(now, start);
    return until ? `Starting in ${until}` : 'Starting now';
  }
  return '';
}
