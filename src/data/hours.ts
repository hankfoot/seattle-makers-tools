/**
 * When the space is open.
 *
 * **Read off seattlemakers.org, not remembered**, the same rule the phone
 * number follows: the site publishes these in two independent phrasings that
 * agree - a block on the home, contact and about pages ("Mon 2-10pm / Tue
 * CLOSED / Wed 2-10pm / Thu 2-10pm / Fri 2-10pm / Sat & Sun: 10am-8pm") and a
 * sentence on the contact page ("Monday, Wednesday - Friday: 2-10pm (Closed
 * Tuesday), Saturday & Sunday: 10am-8pm"). Checked 2026-09-23.
 *
 * **If the space changes its hours it changes them there first, and this has
 * to follow.** Wrong hours on a wall are worse than none, because somebody
 * reads them and goes home.
 *
 * Corroborated against the calendar rather than taken on trust: across all 193
 * events, **Tuesday has none at all**, and not one event on any day starts
 * after closing. Two Wednesdays in early September ran a guided studio from
 * 12:00, two hours before opening - which is why `lib/hours.ts` never lets
 * this table contradict a class that is actually running.
 *
 * Floating local times, matching the feed and everything else on the board.
 */
export type DayHours = { open: string; close: string } | null;

/** Sunday first, so the index is `Date.getDay()`. `null` is closed all day. */
export const WEEK: readonly DayHours[] = [
  { open: '10:00', close: '20:00' }, // Sunday
  { open: '14:00', close: '22:00' }, // Monday
  null, //                              Tuesday
  { open: '14:00', close: '22:00' }, // Wednesday
  { open: '14:00', close: '22:00' }, // Thursday
  { open: '14:00', close: '22:00' }, // Friday
  { open: '10:00', close: '20:00' }, // Saturday
];
