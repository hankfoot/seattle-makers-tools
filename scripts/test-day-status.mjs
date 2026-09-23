/**
 * Tests for lib/day-status.ts - the rules that decide what a wall display
 * calls "on now".
 *
 * Run with `npm test`. Node strips the types; there is no test framework and
 * no build step, which is the whole reason this is a plain .mjs.
 */
import { sessionEnd, statuses, progress, gap, clock, clockParts, endLabel, startingSoon, SOON_MINUTES, statusNote }
  from '../src/lib/day-status.ts';

let pass = 0, fail = 0;
const eq = (got, want, label) => {
  if (got === want) { pass++; }
  else { fail++; console.log(`  FAIL ${label}\n       got  ${JSON.stringify(got)}\n       want ${JSON.stringify(want)}`); }
};

// --- the multi-part-series rule, the whole reason this module exists ---
eq(sessionEnd('2026-09-09T18:30', '2026-09-30T21:30'), '2026-09-09T21:30', 'series collapses to same-day session');
eq(sessionEnd('2026-08-24T19:00', '2026-09-14T21:00'), '2026-08-24T21:00', 'ceramics series');
eq(sessionEnd('2026-08-01T12:00', '2026-08-01T13:00'), '2026-08-01T13:00', 'ordinary same-day event untouched');
eq(sessionEnd('2026-08-01T12:00', null),               '2026-08-01T14:00', 'missing end -> default 2h');
eq(sessionEnd('2026-08-01T22:00', '2026-08-02T01:00'), '2026-08-01T23:59', 'cross-midnight end -> default, clamped to the same day');

// --- statuses ---
const day = [
  { start: '2026-09-19T09:00', end: '2026-09-19T10:00' },
  { start: '2026-09-19T13:00', end: '2026-09-19T15:00' },
  { start: '2026-09-19T17:00', end: '2026-09-19T18:00' },
  { start: '2026-09-19T19:00', end: '2026-09-19T20:00' },
];
eq(statuses(day, '2026-09-19T08:00').join(), 'next,later,later,later', 'before the day starts');
eq(statuses(day, '2026-09-19T09:30').join(), 'live,next,later,later',  'during the first');
eq(statuses(day, '2026-09-19T10:00').join(), 'past,next,later,later',  'exactly at an end -> past');
eq(statuses(day, '2026-09-19T12:00').join(), 'past,next,later,later',  'in a gap');
eq(statuses(day, '2026-09-19T13:00').join(), 'past,live,next,later',   'exactly at a start -> live');
eq(statuses(day, '2026-09-19T21:00').join(), 'past,past,past,past',    'after the day ends');
eq(statuses([], '2026-09-19T12:00').length, 0, 'empty day');

// --- only ever one "next" ---
const s = statuses(day, '2026-09-19T09:30');
eq(s.filter(x => x === 'next').length, 1, 'exactly one next');

// --- progress / gap / clock ---
eq(Math.round(progress('2026-09-19T13:00','2026-09-19T15:00','2026-09-19T14:00')), 50, 'halfway');
eq(progress('2026-09-19T13:00','2026-09-19T15:00','2026-09-19T12:00'), 0, 'before start clamps to 0');
eq(progress('2026-09-19T13:00','2026-09-19T15:00','2026-09-19T16:00'), 100, 'after end clamps to 100');
eq(gap('2026-09-19T13:00','2026-09-19T14:12'), '1h 12m', 'gap h+m');
eq(gap('2026-09-19T13:00','2026-09-19T13:48'), '48m', 'gap minutes');
eq(gap('2026-09-19T13:00','2026-09-19T15:00'), '2h', 'gap whole hours');
eq(gap('2026-09-19T13:00','2026-09-19T13:00'), '', 'no gap');
eq(clock('2026-09-19T00:05'), '12:05 am', 'midnight hour');
eq(clock('2026-09-19T12:00'), '12:00 pm', 'noon');
eq(clock('2026-09-19T14:30'), '2:30 pm', 'afternoon');
// The board sets these two at different sizes, so the split has to survive the
// three hours that are not simply "h % 12".
eq(clockParts('2026-09-19T00:05').hour, '12:05', 'parts: midnight hour');
eq(clockParts('2026-09-19T00:05').meridiem, 'am', 'parts: midnight meridiem');
eq(clockParts('2026-09-19T12:00').hour, '12:00', 'parts: noon hour');
eq(clockParts('2026-09-19T12:00').meridiem, 'pm', 'parts: noon is pm');
eq(clockParts('2026-09-19T11:59').meridiem, 'am', 'parts: minute before noon is am');
eq(clockParts('2026-09-19T14:30').hour, '2:30', 'parts: afternoon hour drops the leading zero');
// The two must never disagree - clock() is the hero's and is built from these.
eq(clock('2026-09-19T09:05'), `${clockParts('2026-09-19T09:05').hour} ${clockParts('2026-09-19T09:05').meridiem}`, 'parts and clock agree');
// --- the end time, under the start ---
// The meridiem is dropped when it repeats, and kept when it turns over.
eq(endLabel('2026-09-19T14:15', '2026-09-19T16:15'), '– 4:15',    'same half of the day drops pm');
eq(endLabel('2026-09-19T11:30', '2026-09-19T13:00'), '– 1:00pm',  'crossing noon keeps it');
eq(endLabel('2026-09-19T23:00', '2026-09-20T00:30'), '– 12:30am', 'crossing midnight keeps it');
eq(endLabel('2026-09-19T09:00', '2026-09-19T11:30'), '– 11:30',   'morning to morning drops am');

// --- a cancelled class is never running and is never what is next ---
// Both of these were true of the live calendar before `off` existed: the
// cancelled ceramics class came out `next` at 17:10 and `live` at 18:00.
{
  const day = [
    { start: '2026-09-22T13:00', end: '2026-09-22T14:00', title: 'Public Tour' },
    { start: '2026-09-22T17:30', end: '2026-09-22T20:00', title: 'Ceramics (CANCELLED)' },
    { start: '2026-09-22T19:00', end: '2026-09-22T22:00', title: 'Woodshop Basics' },
  ];
  const off = (e) => /cancelled/i.test(e.title);
  const at = (t) => statuses(day, `2026-09-22T${t}`, off);

  eq(at('17:10').join(','), 'past,later,next', 'cancelled cannot take the next slot');
  // 18:00 is inside the cancelled class's own 17:30-20:00 slot, so without the
  // predicate it is `live` - see the no-predicate check below, which is the
  // control for this one. Woodshop Basics has not started yet, so it is next.
  eq(at('18:00').join(','), 'past,later,next', 'cancelled cannot be on now');
  eq(at('21:00').join(','), 'past,past,live', 'cancelled still goes past once its slot has gone');
  // Without the predicate the old behaviour is intact, so nothing else that
  // calls statuses() changes meaning.
  eq(statuses(day, '2026-09-22T18:00').join(','), 'past,live,next', 'no predicate, no change');
}

// --- "starting soon" has to mean soon ---
// The row that is next at nine in the morning can be six hours away, and a
// badge reading "starting soon" over it is simply false.
eq(SOON_MINUTES, 30, 'the window is half an hour');
eq(startingSoon('2026-09-19T14:00', '2026-09-19T13:29'), false, '31m out is not soon');
eq(startingSoon('2026-09-19T14:00', '2026-09-19T13:30'), true, 'exactly 30m out is soon');
eq(startingSoon('2026-09-19T14:00', '2026-09-19T13:59'), true, '1m out is soon');
eq(startingSoon('2026-09-19T10:00', '2026-09-19T09:00'), false, 'the morning board\'s first class is not soon');
eq(startingSoon('2026-09-19T18:00', '2026-09-19T09:00'), false, 'nine hours out is not soon');
// It is only ever asked of a row that has not started - statuses() calls
// anything at or past its start `live` - but the rule should not invert if it
// ever is.
eq(startingSoon('2026-09-19T14:00', '2026-09-19T14:00'), true, 'starting now is soon');

eq(statusNote('live','2026-09-19T13:00','2026-09-19T15:00','2026-09-19T14:00'), 'On now · 1h left', 'live note carries the state');
eq(statusNote('next','2026-09-19T13:00','2026-09-19T15:00','2026-09-19T12:30'), 'Starting in 30m', 'next note at the boundary');
// The note is also what raises a row's tier in today.ts, so an empty one means
// a condensed row. A class six hours out has nothing on it to act on, and a
// finished one says nothing that the greyed plate and the passed time do not.
eq(statusNote('next','2026-09-19T18:00','2026-09-19T19:00','2026-09-19T12:00'), '', 'next but not soon says nothing');
eq(statusNote('next','2026-09-19T13:00','2026-09-19T15:00','2026-09-19T12:29'), '', '31m out says nothing');
eq(statusNote('past','2026-09-19T13:00','2026-09-19T15:00','2026-09-19T16:00'), '', 'finished says nothing');
eq(statusNote('later','2026-09-19T18:00','2026-09-19T19:00','2026-09-19T12:00'), '', 'later says nothing');

// --- the shapes the real calendar actually contains ---
// This used to sweep src/data/events.json. That file is gone, and a test that
// depends on a data file is testing the data rather than the rule - so the
// shapes it covered are written out instead, taken from measuring the calendar
// while it still existed: 130 of 142 events under 4h, 8 multi-day series rows,
// and a handful in between.
const SHAPES = [
  ['2026-08-01T12:00', '2026-08-01T13:00', '1h tour'],
  ['2026-08-01T14:00', '2026-08-01T15:00', '1h orientation'],
  ['2026-09-19T13:00', '2026-09-19T15:30', '2.5h class, the median'],
  ['2026-09-05T09:00', '2026-09-05T17:00', '8h open studio'],
  ['2026-09-09T18:30', '2026-09-30T21:30', '4-part series, 3h sessions'],
  ['2026-08-24T19:00', '2026-09-14T21:00', '4-part series, 2h sessions'],
  ['2026-08-05T18:30', '2026-08-19T21:30', 'series across a fortnight'],
];
let bad = 0;
for (const [start, end, what] of SHAPES) {
  const se = sessionEnd(start, end);
  const sameDay = se.slice(0, 10) === start.slice(0, 10);
  const after = se > start;
  if (!sameDay || !after) { bad++; console.log(`  FAIL ${what}: ${start} + ${end} -> ${se}`); }
}
eq(bad, 0, `every calendar shape -> a same-day end after its start`);

console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
