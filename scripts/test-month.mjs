/**
 * lib/month.ts, checked without a browser.
 *
 * No framework, matching test-day-status.mjs: Node strips the types, `assert`
 * does the rest. Run by `npm test`.
 *
 * What is worth testing here is the arithmetic that is easy to get subtly
 * wrong and impossible to see on a poster - a month that needs six rows given
 * five, a year boundary, the leading days of the previous month - plus the two
 * title rules, which are narrow by design and whose whole value is that they
 * leave everything else alone.
 */
import assert from 'node:assert/strict';
import {
  monthKey,
  monthLabel,
  monthName,
  shiftMonth,
  isoDay,
  monthGrid,
  inMonth,
  compactTime,
  displayTitle,
} from '../src/lib/month.ts';

let checks = 0;
const is = (actual, expected, what) => {
  checks++;
  assert.deepEqual(actual, expected, what);
};

/* ------------------------------------------------------------ month keys */

is(monthKey(new Date(2026, 8, 20)), '2026-09', 'monthKey pads the month');
is(monthKey(new Date(2026, 0, 1)), '2026-01', 'monthKey in January');
is(monthLabel('2026-09'), 'September 2026', 'monthLabel');
is(monthName('2026-12'), 'December', 'monthName drops the year');

is(shiftMonth('2026-09', 1), '2026-10', 'shiftMonth forwards');
is(shiftMonth('2026-12', 1), '2027-01', 'shiftMonth rolls the year forwards');
is(shiftMonth('2026-01', -1), '2025-12', 'shiftMonth rolls the year backwards');
is(shiftMonth('2026-09', 0), '2026-09', 'shiftMonth by zero');
is(shiftMonth('2026-09', 14), '2027-11', 'shiftMonth past a year');

is(isoDay(new Date(2026, 8, 5)), '2026-09-05', 'isoDay pads');

/* ----------------------------------------------------------------- grids */

// September 2026 starts on a Tuesday and has 30 days: 2 leading + 30 = 32,
// which needs five rows.
const sep = monthGrid('2026-09');
is(sep.length, 5, 'September 2026 fits in five rows');
is(
  sep.every((w) => w.length === 7),
  true,
  'every row is a whole week',
);
is(sep[0][0], '2026-08-30', 'the grid opens on the Sunday before the 1st');
is(sep[0][2], '2026-09-01', 'the 1st lands on its own weekday');
is(sep.at(-1).at(-1), '2026-10-03', 'and closes on the Saturday after the 30th');

// August 2026 starts on a Saturday and has 31 days: 6 leading + 31 = 37, so it
// genuinely needs six rows. A fixed five would have lost the last two days.
const aug = monthGrid('2026-08');
is(aug.length, 6, 'August 2026 needs six rows');
is(aug.flat().includes('2026-08-31'), true, 'and the 31st is on it');

// February 2027 is 28 days starting on a Monday: 1 + 28 = 29, five rows.
is(monthGrid('2027-02').length, 5, 'a short February still takes five rows');
// February 2026 is 28 days starting on a Sunday - the one shape that fits in
// four rows, and it falls out of the same arithmetic rather than needing a case.
is(monthGrid('2026-02').length, 4, 'February 2026 fits in four rows');

// Across a year boundary the neighbours come from the right years.
const jan = monthGrid('2027-01');
is(jan[0][0], '2026-12-27', 'January reaches back into the previous year');
is(jan.at(-1).at(-1), '2027-02-06', 'and forward into the next month');

// Every day of the month appears exactly once, for a spread of shapes.
for (const key of ['2026-02', '2026-08', '2026-09', '2027-01', '2028-02']) {
  const days = monthGrid(key).flat().filter((d) => inMonth(d, key));
  const total = new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)), 0).getDate();
  is(days.length, total, `${key} carries all ${total} of its days`);
  is(new Set(days).size, total, `${key} carries none of them twice`);
}

is(inMonth('2026-09-30', '2026-09'), true, 'inMonth: the last day is in');
is(inMonth('2026-10-01', '2026-09'), false, 'inMonth: the next day is out');

/* ------------------------------------------------------------------ time */

is(compactTime('2026-09-05T18:00'), '6pm', 'a whole hour drops its minutes');
is(compactTime('2026-09-05T18:30'), '6:30pm', 'a half hour keeps them');
is(compactTime('2026-09-05T09:15'), '9:15am', 'morning');
is(compactTime('2026-09-05T00:00'), '12am', 'midnight is 12am, not 0am');
is(compactTime('2026-09-05T12:00'), '12pm', 'noon is 12pm, not 0pm');
is(compactTime('2026-09-05T13:05'), '1:05pm', 'single-digit minutes keep the zero');

/* ----------------------------------------------------------------- title */

is(displayTitle('🪚 Woodshop Guided Studio'), 'Woodshop Guided Studio', 'leading emoji goes');
is(
  displayTitle('🎃 Costume Making Session: Final Session Before our Costume Party! 🎃'),
  'Costume Making Session: Final Session Before our Costume Party!',
  'and a trailing one',
);
is(displayTitle('🏺 Ceramics Guided Studio and Test Out Times'), 'Ceramics Guided Studio and Test Out Times', 'ceramics');

// Left alone: no emoji, and a prime is not one.
is(
  displayTitle('Big CNC: Industrial 4′ x 10′ Wood Cutting Certification'),
  'Big CNC: Industrial 4′ x 10′ Wood Cutting Certification',
  'primes and colons survive',
);
is(displayTitle('Advanced Embroidery – Patch Making with Inkstitch'), 'Advanced Embroidery – Patch Making with Inkstitch', 'an en dash is not decoration');

// The studio prefix rule is colon-delimited and nothing else.
is(displayTitle('Sewing: Guided Studio', 'sewing'), 'Guided Studio', 'a redundant "Sewing:" prefix goes');
is(displayTitle('Sewing: Guided Studio', 'ceramics'), 'Sewing: Guided Studio', 'but only for the studio being printed');
is(
  displayTitle('Screen Printing Certification', 'screen printing'),
  'Screen Printing Certification',
  'no colon, no strip - "Certification" alone would be ambiguous',
);
is(
  displayTitle('Woodshop Basics (4 Part Series)', 'woodshop'),
  'Woodshop Basics (4 Part Series)',
  'and "Basics" alone would be worse still',
);
is(
  displayTitle('Big CNC: Industrial 4′ x 10′ Wood Cutting Certification', 'cnc'),
  'Big CNC: Industrial 4′ x 10′ Wood Cutting Certification',
  'the colon has to follow the studio name, not just exist',
);
is(displayTitle('🪚 Woodshop: Guided Studio', 'woodshop'), 'Guided Studio', 'emoji then prefix, in that order');
is(displayTitle('  Spaced Out  '), 'Spaced Out', 'and it trims');

console.log(`month: ${checks} checks passed`);
