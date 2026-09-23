/**
 * Whether the space is open, and what to say about it.
 *
 * Pure over floating-local strings like the rest of the board's time logic, so
 * `?now=` drives this exactly as it drives the schedule. The only data it
 * imports is the week table itself, which is a seven-item array.
 *
 * **The hours never contradict the calendar.** A class can be scheduled
 * outside published hours - two Wednesdays in early September ran a guided
 * studio from noon against a 2pm opening - and a board saying "Thanks for
 * visiting" over a class that is running would be wrong in the one way that
 * matters. `openState()` therefore takes `somethingLive`, and treats the space
 * as open whenever the schedule says so. The published hours are what the
 * space claims; the calendar is what is actually happening, and when they
 * disagree the calendar wins.
 */
import { WEEK, type DayHours } from '../data/hours.ts';

export type { DayHours };

/** Where the clock stands against today's published hours. */
export type OpenPhase = 'open' | 'before' | 'after' | 'closed';

export type OpenState = {
  phase: OpenPhase;
  /** Today's published hours, or null on a day the space is shut. */
  today: DayHours;
  /** The next opening, when there is a useful one to name. */
  next: { inDays: number; time: string } | null;
};

const mins = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/** `Date.getDay()` for a floating-local day string, via local midnight. */
function weekday(iso: string): number {
  return new Date(`${iso.slice(0, 10)}T00:00:00`).getDay();
}

export function hoursOn(iso: string): DayHours {
  return WEEK[weekday(iso)] ?? null;
}

/**
 * The next day the space opens, searching from `fromOffset` days out.
 *
 * Returns null only if the whole week is closed, which cannot happen with the
 * table as it stands but is cheaper to handle than to assume away.
 */
function nextOpening(iso: string, fromOffset: number): { inDays: number; time: string } | null {
  const base = weekday(iso);
  for (let i = fromOffset; i <= fromOffset + 7; i++) {
    const h = WEEK[(base + i) % 7];
    if (h) return { inDays: i, time: h.open };
  }
  return null;
}

export function openState(now: string, somethingLive = false): OpenState {
  const today = hoursOn(now);
  const at = mins(now.slice(11, 16));

  if (!today) {
    // Shut all day - unless the calendar says otherwise, which is the case the
    // published hours are not allowed to win.
    return somethingLive
      ? { phase: 'open', today, next: null }
      : { phase: 'closed', today, next: nextOpening(now, 1) };
  }
  if (at < mins(today.open)) {
    return somethingLive
      ? { phase: 'open', today, next: null }
      : { phase: 'before', today, next: { inDays: 0, time: today.open } };
  }
  if (at >= mins(today.close)) {
    return somethingLive
      ? { phase: 'open', today, next: null }
      : { phase: 'after', today, next: nextOpening(now, 1) };
  }
  return { phase: 'open', today, next: null };
}

/** "2 pm", "10 am" - the board's own clock voice, minutes dropped when :00. */
export function hourLabel(hhmm: string): string {
  const h = Number(hhmm.slice(0, 2));
  const m = hhmm.slice(3, 5);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const suffix = h < 12 ? 'am' : 'pm';
  return m === '00' ? `${h12}${suffix}` : `${h12}:${m}${suffix}`;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** "tomorrow", "Wednesday" - whichever a person would actually say. */
function whenWord(now: string, inDays: number): string {
  if (inDays === 0) return 'today';
  if (inDays === 1) return 'tomorrow';
  return DAY_NAMES[(weekday(now) + inDays) % 7]!;
}

/**
 * The greeting. The one line on this board addressed to a person rather than
 * about the schedule, so it is the line that changes when the door is locked.
 */
export function greeting(s: OpenState): string {
  if (s.phase === 'after') return 'Thanks for visiting!';
  if (s.phase === 'closed') return 'See you next time!';
  if (s.phase === 'before' && s.next) return `We open at ${hourLabel(s.next.time)} today`;
  return 'Welcome to Seattle Makers!';
}

/**
 * Today's hours, or - when there are none left to use - when the space is next
 * open. Deliberately does not repeat the opening time the greeting already
 * gives on a `before` board; it adds the closing time instead.
 */
export function hoursNote(now: string, s: OpenState): string {
  if (s.phase === 'after' || s.phase === 'closed') {
    if (!s.next) return 'Closed today';
    const when = whenWord(now, s.next.inDays);
    return `Open again ${when} at ${hourLabel(s.next.time)}`;
  }
  if (!s.today) return 'Closed today';
  return `Today's hours · ${hourLabel(s.today.open)} – ${hourLabel(s.today.close)}`;
}
