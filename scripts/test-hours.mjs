/**
 * Tests for lib/hours.ts - when the board says the space is open.
 *
 * Run with `npm test`. No framework, no build step, same as the others.
 *
 * The dates below are real weekdays and are chosen for that: 2026-09-21 is a
 * Monday (2-10pm), 2026-09-22 a Tuesday (closed), 2026-09-26 a Saturday
 * (10am-8pm).
 */
import { openState, hoursOn, hourLabel, greeting, hoursNote }
  from '../src/lib/hours.ts';

let pass = 0, fail = 0;
const eq = (got, want, label) => {
  if (got === want) { pass++; }
  else { fail++; console.log(`  FAIL ${label}\n       got  ${JSON.stringify(got)}\n       want ${JSON.stringify(want)}`); }
};

// --- the week reads the way the site publishes it ---
eq(hoursOn('2026-09-21T12:00')?.open, '14:00', 'Monday opens at 2pm');
eq(hoursOn('2026-09-22T12:00'), null,          'Tuesday is closed');
eq(hoursOn('2026-09-26T12:00')?.open, '10:00', 'Saturday opens at 10am');
eq(hoursOn('2026-09-26T12:00')?.close, '20:00','Saturday closes at 8pm');

// --- the phases ---
const phase = (iso, live = false) => openState(iso, live).phase;
eq(phase('2026-09-21T13:59'), 'before', 'a minute before opening');
eq(phase('2026-09-21T14:00'), 'open',   'exactly at opening');
eq(phase('2026-09-21T21:59'), 'open',   'a minute before closing');
eq(phase('2026-09-21T22:00'), 'after',  'exactly at closing');
eq(phase('2026-09-22T15:00'), 'closed', 'Tuesday at any hour');

// --- the calendar outranks the table ---
// Two Wednesdays in early September ran a guided studio from noon against a
// 2pm opening. A board cannot say "thanks for visiting" over a running class.
eq(phase('2026-09-21T12:00', true), 'open', 'a live class before opening reads open');
eq(phase('2026-09-21T23:00', true), 'open', 'a live class after closing reads open');
eq(phase('2026-09-22T15:00', true), 'open', 'a live class on a closed day reads open');

// --- when it opens next ---
const next = (iso) => openState(iso).next;
eq(next('2026-09-21T13:00').inDays, 0, 'before opening, next is today');
eq(next('2026-09-21T13:00').time, '14:00', 'and names the opening time');
// Monday night -> Tuesday is closed, so it skips to Wednesday.
eq(next('2026-09-21T23:00').inDays, 2, 'after Monday closing, next is Wednesday');
eq(next('2026-09-22T09:00').inDays, 1, 'on closed Tuesday, next is tomorrow');

// --- the words ---
eq(hourLabel('14:00'), '2pm',    'whole hours drop the minutes');
eq(hourLabel('10:00'), '10am',   'morning');
eq(hourLabel('09:30'), '9:30am', 'a half hour keeps them');
eq(hourLabel('00:00'), '12am',   'midnight');
eq(hourLabel('12:00'), '12pm',   'noon');

const say = (iso) => { const s = openState(iso); return [greeting(s), hoursNote(iso, s)]; };
eq(say('2026-09-21T15:00')[0], 'Welcome to Seattle Makers!', 'open: the welcome');
eq(say('2026-09-21T15:00')[1], "Today's hours · 2pm – 10pm", 'open: the hours');
eq(say('2026-09-21T12:00')[0], 'We open at 2pm today',       'before: says when');
eq(say('2026-09-21T12:00')[1], "Today's hours · 2pm – 10pm", 'before: still the hours');
eq(say('2026-09-21T23:00')[0], 'Thanks for visiting!',       'after: the sign-off');
eq(say('2026-09-21T23:00')[1], 'Open again Wednesday at 2pm','after: names the day, skipping Tuesday');
eq(say('2026-09-22T09:00')[0], 'See you next time!',         'closed all day');
eq(say('2026-09-22T09:00')[1], 'Open again tomorrow at 2pm', 'closed: tomorrow, not the weekday name');
// A Saturday closing points at Sunday, which is a different opening time.
eq(say('2026-09-26T21:00')[1], 'Open again tomorrow at 10am', 'weekend hours differ');

console.log(`\n  ${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
