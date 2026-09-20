/**
 * Tests for lib/day-status.ts - the rules that decide what a wall display
 * calls "on now".
 *
 * Run with `npm test`. Node strips the types; there is no test framework and
 * no build step, which is the whole reason this is a plain .mjs.
 */
import { sessionEnd, statuses, progress, gap, clock, statusNote, nowLocal }
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
eq(statusNote('live','2026-09-19T13:00','2026-09-19T15:00','2026-09-19T14:00'), '1h left', 'live note');
eq(statusNote('next','2026-09-19T13:00','2026-09-19T15:00','2026-09-19T12:30'), 'starts in 30m', 'next note');

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
