/**
 * Tests for lib/summarise.mjs - turning WordPress's og:description into a
 * sentence or two worth putting on a board.
 *
 * The inputs are real strings taken from seattlemakers.org event pages, not
 * invented ones: the four failure modes this guards against are all things
 * that site actually produces.
 */
import { summarise, ogDescription } from '../src/lib/summarise.mjs';

let pass = 0, fail = 0;
const eq = (got, want, label) => {
  if (got === want) pass++;
  else { fail++; console.log(`  FAIL ${label}\n       got  ${JSON.stringify(got)}\n       want ${JSON.stringify(want)}`); }
};

// --- already short and complete: left exactly alone ---
eq(summarise('Join us for a free tour of the Seattle Makers maker space.'),
   'Join us for a free tour of the Seattle Makers maker space.',
   'short sentence untouched');
eq(summarise('Become certified to use the 3D printers at Seattle Makers!'),
   'Become certified to use the 3D printers at Seattle Makers!',
   'exclamation untouched');
eq(summarise('Ready to tackle sewing projects at the top level? Join us for our Industrial Sewing Certification!'),
   'Ready to tackle sewing projects at the top level? Join us for our Industrial Sewing Certification!',
   'two sentences under budget, both kept');

// --- (1) WordPress's cut marker ---
eq(summarise('A tidy sentence. And another one. Screen exposure and […]'),
   'A tidy sentence. And another one.',
   'trailing [...] dropped with its partial sentence');

// --- (2) a heading glued to the first sentence ---
eq(summarise('Woodshop 101 Certification is required prior to using the woodshop Working on a project and want a bit of backup? Come build during Guided Studio time!'),
   'Working on a project and want a bit of backup? Come build during Guided Studio time!',
   'glued heading dropped');
// ...but a capitalised proper noun mid-sentence must NOT trigger it
eq(summarise('Join us for a free tour of the Seattle Makers maker space.'),
   'Join us for a free tour of the Seattle Makers maker space.',
   'proper noun is not mistaken for a heading');

// --- (3) flattened bullet list, announced by an emoji ---
eq(summarise('Welcome to the art of analog screen printing! What’s covered \u{1F31E} Printing films & burning screens Films'),
   'Welcome to the art of analog screen printing!',
   'cut at the emoji');

// --- (4) missing space after a full stop ---
eq(summarise('This course covers the serger.In this course we go over set-up.'),
   'This course covers the serger. In this course we go over set-up.',
   'space restored after full stop');

// --- budget: whole sentences only, never a fragment ---
const long = 'One two three four five six seven eight nine ten. ' + 'A'.repeat(200) + '.';
eq(summarise(long), 'One two three four five six seven eight nine ten.',
   'second sentence over budget is dropped, not cut');
eq(summarise('A'.repeat(300)), null, 'no sentence ending and over budget -> nothing rather than a fragment');
eq(summarise('No terminal punctuation but short'), 'No terminal punctuation but short',
   'no sentence ending but under budget -> kept');
eq(summarise(''), null, 'empty');
eq(summarise(null), null, 'null');
eq(summarise('   \n  '), null, 'whitespace only');

// --- the first sentence is kept even when it alone exceeds the budget ---
const oneLong = 'B'.repeat(220) + '.';
eq(summarise(oneLong), 'B'.repeat(220) + '.', 'a single over-budget sentence is still whole');

// --- ogDescription ---
eq(ogDescription('<meta property="og:description" content="Hello &amp; welcome" />'),
   'Hello & welcome', 'og:description with an entity');
eq(ogDescription('<meta content="Reversed order" property="og:description">'),
   'Reversed order', 'attribute order reversed');
eq(ogDescription('<meta name="description" content="wrong tag">'), null, 'only og:description counts');
eq(ogDescription('<html></html>'), null, 'absent');

console.log(`\n  ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
