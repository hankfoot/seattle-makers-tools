# CLAUDE.md — seattle-makers-tools

> Read this fully at the start of every session.

## What this is

A suite of small web tools for Seattle Makers, served as one static site.
A **today board** for a screen in the space, a **label maker** for the Label
Station's die-cut sheets, and a **slideshow** for markets - currently parked.

Astro + Tailwind v4, static output. See [README.md](README.md) for how to run
it, add studio photos, and refresh events.

**Started:** 2026-08-27

## Current state

Slideshow tool is **broken as of 2026-09-19** - it builds and runs, but has
lost every event slide. See *Broken: the reel's event slides* under Next. The
rest of this section describes it as it was and as it should be again.

Done:
- 25-slide reel following the *Background Reel* deck's rhythm (brand card ->
  two studio photos -> an upcoming class).
- Assets extracted from that deck: 17 studio photos across 6 studios, the
  wordmark, and 8 studio icons. 4 more icons drawn to match.
- Brand card rebuilt in HTML with the 12 current studios and the Interbay
  address (the deck still showed Wallingford / Gas Works Park).
- `scripts/fetch-events.mjs` scrapes the calendar (142 events) and pulls each
  event's own picture; 15 kept after filtering out the category logo tiles.
- On-screen control bar (prev/pause/next, progress, counter, speed, full
  screen), bottom-right, auto-hiding with the cursor.
- Studio photos pulled from the shared *Social Media Photos* Google Photos
  album: 9 of 11 studios have current-space photos. 28-slide loop.
- Each studio's event card sits directly after that studio's photos.
- Event cards use the event's own photo, else the studio icon - never a generic
  studio photo, which in that frame reads as a picture of the class.
- `preferEvent` in studios.ts is the editorial override for which class a studio
  features (electronics -> Programmable LEDs).
- Interest-form QR: on the brand card where the map used to be, and full screen
  on `q`. Generated at author time by `npm run qr` into public/brand/, so **the
  reel** ships no QR library. Verified by decoding the shipped SVG with OpenCV.
  (The `/labels` tool does encode in the browser - see below. Astro splits
  scripts per page, so the reel's bundle is unaffected.)
- The Interbay map is gone - it was inaccurate, and at a market the scannable
  thing is worth more than the map anyway.

Today board (`/today`) is built and verified in the browser.

Done:
- Everything on today's calendar, with kind, fullness and cancellation, fetched
  live from /api/events. Refreshes every five
  minutes and on `visibilitychange`.
- `/events-dummy.json` is a prerendered endpoint, not a file in public/. Its
  times are generated at build time relative to the build's clock, so it is
  always "today" with something running rather than a fixture that rots.
  `/events.json` is gone - see *There is no fallback calendar* below.
- The slideshow is parked: its entry on the index is commented out, the page
  and `scripts/slideshow.ts` are untouched, and `/slideshow` still serves.

Label maker (`/labels`) is built and verified against a print-to-PDF. Most of
the *Implementation notes* below are about it.

Done:
- `npm run check` now actually runs; `@astrojs/check` and `typescript` were
  never installed, so the script had only ever prompted to install them. It
  reports 8 pre-existing errors in the slideshow (a `status` global collision,
  `hidden` on SVGElement, two boolean coercions). Not touched here.
- The QR sign generator (`/qr`) was removed on 2026-09-19. It shared nothing
  with the label maker but the Fraunces face; `lib/print-qr.ts` and the
  module-size warnings were always the label tool's.

All three pages were rebranded against seattlemakers.org on 2026-09-19 and
verified in the browser at 1440 and 375, and on paper.

Done:
- Roboto replaces Lato on the tool pages, the palette was re-read off the live
  site, and every page now carries the same masthead. Fraunces is gone.
- `/today` rebuilt around a time rail; `/` rebuilt as hairline rows; `/labels`
  chrome retokenised, its dotted ground dropped and its Print button made the
  website's green pill.
- The reel is deliberately untouched and stays on Lato. See *Branding* below.

A facelift pass followed on the same day, because copying seattlemakers.org
faithfully also copied what is dated about it.

Done:
- Figtree joins Roboto as the display face, headings move from green to ink,
  `--color-sm-mist` lightens, the sheets gain a radius and a soft shadow, and
  the label-availability tags become tinted chips.
- Printed labels are unchanged - still Roboto, insets identical to three
  decimals after the pass.
- The masthead was then rebuilt twice more: light and sticky, because it was
  the one element the facelift had skipped; then reduced to a monogram, a
  title and one outbound link, with the tool list moved back onto the page.
- Finally every page gained a green hero panel, which is where the brand
  colour stopped being a garnish - holding the title and subtitle only, with
  the crumb, the stamp and the stats arranged around it.

Next:

**Broken: the reel's event slides.** `src/data/events.json` was deleted on
2026-09-19 because the board no longer needed it and nobody ever ran
`npm run events` to keep it current - it was 24 events behind. `/slideshow`
still builds and still runs, but `pickByStudio` now has nothing to pick from,
so the reel is 21 slides instead of 28: brand card and studio photos, and not
one "upcoming class". On a market table that is the slide that did the
convincing.

It cannot be fixed by calling /api/events. The reel is built to keep running
where there is no wifi - that is why `output: 'static'` exists and why the
fonts and photos are all local - so its calendar has to be baked in at build
time. Three ways out, roughly in order of how much they cost:

1. Re-run `npm run events` at build time, from CI, so the file exists in the
   build but is never committed. Closest to the old behaviour without the
   rotting. `.gitignore` it, and make the build tolerate the scrape failing.
2. Keep the file committed but refresh it on a schedule - a daily GitHub Action
   running `npm run events` and committing the diff. Simplest, and was already
   on this list before any of this.
3. Give the reel its own much smaller fixture: the handful of recurring classes
   worth advertising, hand-maintained, with no dates. The reel does not really
   need *today's* schedule - it needs "we teach this".

**Broken: event descriptions on the board.** Live rows now carry a title, a
time and a kind, and nothing else. The calendar grid the Worker scrapes has no
descriptions at all; the ones the board used to show were grafted on by title
from the baked file (83 of 166 matched). Getting them back means fetching each
event's own page from the Worker, which is 160-odd requests per refresh and far
too slow to do per request - so it wants the same build-time or scheduled
treatment as the reel, writing a small title-to-description map rather than a
whole calendar.

- Those 8 slideshow type errors.
- Photos for **leatherworking** and **a/v studio** - the only two studios still
  without any. Nothing suitable in the album's recent pages.
- 3d printing, cnc and laser cutting still show *certifications* rather than
  classes. That is the calendar, not the ranking: none of the three has an
  upcoming class, only certifications. Revisit when the calendar fills out.
- Drop the `50-deck-*.jpg` photos once every studio has enough current ones;
  they are of the old Wallingford space and only exist as a backstop.
- Deploy. Output is static; nothing needs a server.
- Possibly a scheduled events refresh (daily GitHub Action) once the scraper has
  proven stable across a site change or two.

## Implementation notes

### Branding

**The palette was read off seattlemakers.org with `getComputedStyle`, not
sampled from a screenshot or taken from the brand deck.** A screenshot has
already been through a colour profile, and the deck predates the current site.
What came back:

| token | value | where it is used on the real site |
| --- | --- | --- |
| `--color-sm-green` | `#13723C` | every h1/h2, primary buttons |
| `--color-sm-green-dark` | `#0E4D29` | the hover on those buttons |
| `--color-sm-green-mid` | `#43AA6D` | secondary buttons |
| `--color-sm-sage` | `#84BF80` | nav links on the dark bar |
| `--color-sm-ink` | `#1A1A1A` | the masthead bar |
| `--color-sm-slate` | `#606164` | body copy |
| `--color-sm-mist` | `#E5E5E5` | the ground the white content sits on |

The old `--color-sm-green` was `#10733c`, sampled from the wordmark in the
deck. Three units is invisible on its own and obvious in a tab next to the real
one. `--color-sm-ink` moved `#111111` -> `#1A1A1A` at the same time, which also
shifts the reel's stage black by a hair; that is intended, there is one black.

The **refresh** then moved two of these off the site's own values on purpose:
`--color-sm-mist` `#E5E5E5` -> `#F2F4F2` and `--color-sm-line` -> `#E4E7E4`.
The site's grey is heavy and flat, and it was the single biggest thing making
these pages feel drab - a lighter, faintly green-cast ground reads as air
rather than as a background. `--color-sm-slate` warmed `#606164` -> `#5C6360`
to match. The greens are untouched; those are the brand.

**Roboto is the site's body face because it is seattlemakers.org's face** -
every heading, paragraph and nav item there is Roboto. One variable woff2
covers 100-900, so the weights the UI uses cost a single 37K download, less
than the three static Lato files it replaced. Self-hosted, matching how Lato
was handled: the screen by the door should render the same with no network.

**Figtree carries the headings, and it was picked by looking rather than by
argument.** The same line was set in Figtree, Archivo and Roboto directly under
the lockup and screenshotted: the wordmark's "makers" is a heavy geometric with
big round bowls and a straight-legged `k`, which Figtree echoes, Archivo
squares off, and Roboto flattens into something anonymous. It is also the
honest midpoint of this repo's own history - geometric-humanist like the Lato
that was sampled off the wordmark, modern and neutral like the Roboto that
replaced it - and at 20K variable it is smaller than either.

The split is display/text, not decorative: `--font-display` takes h1s, tool
names, event times and titles, nav, buttons and the tracked micro-labels;
`--font-sans` keeps the prose, so the website's own voice still reads in body
copy. Do not reach for Figtree for paragraphs.

**The reel stays on Lato, and names it explicitly.** Its 25 slides were laid
out and verified against Lato's metrics on a fixed 1920x1080 stage, where a
wider face does not reflow so much as overrun. `slideshow.astro` sets
`body { font-family: var(--font-reel) }` because the inherited face is now
Roboto. The tool pages have no such geometry and a much better reason to match
the website.

**Printed labels are set in Roboto and stayed there through the refresh.** The
label sheet inherits `--font-sans`, and the refresh deliberately did not point
it at the display face: a label is the tool's *output*, not its UI, the type
metrics behind `TITLE_MIN` / `FILL_MAX` and the whole auto-fit were tuned
against them, and churning the face a second time would strand a second batch
of drawer stock. The print-to-PDF check after the refresh returned insets
identical to three decimals, which is the proof it did not move. Stock printed
before the Lato -> Roboto change still will not match a fresh sheet.

**Fraunces was deleted, and the old comment about it was wrong.** global.css
described it as "display face for print only", but nothing on the printed sheet
ever referenced it: its only two uses were the `/today` h1 and the `/labels`
sidebar h1, both screen chrome. A serif was also the single loudest thing
saying "different organisation", since seattlemakers.org has no serif anywhere.
Removing both uses took 33K of font with it.

**There is no masthead.** It went through four shapes - a near-black copy of
seattlemakers.org's header, then white and sticky, then an identity strip with
the tool list moved onto the page, then the one-line lockup with the product
name beside it - and the last of those made the answer obvious: a bar whose
only job is to say what site you are on, on a site with two tools, where the
crumb already gets you back to the index. The lockup moved to the footer.

Deleted with it: `SiteHeader.astro`, every `.sm-masthead` / `.sm-brand` /
`.sm-lockup` rule, and `--sm-bar-h`, which existed so `/labels`' sticky sidebar
could clear a sticky bar. That sidebar is back to a plain `top: 2rem` - left as
`calc(var(--sm-bar-h) + 1.25rem)` against a variable that no longer exists, it
resolved to an invalid value and sticky silently fell back to static.

**`html` is painted mist, and the reel overrides it from its own stylesheet.**
It used to be the brand ink globally, so the full-bleed reel never flashed
white behind itself - but `html` is what paints the *canvas*, which includes
the area you rubber-band into when you overscroll. Every tool page therefore
showed a black band above and below itself the moment you scrolled past either
end. `slideshow.astro` sets `html { background: var(--color-sm-ink) }` in its
own `is:global` block now; it is the one page that wants it. Checked by
rendering a page into a viewport far taller than its content and sampling the
corners: `(242,244,242)` all round. `labels.astro`'s print block still forces
`html` white, so the new mist cannot tint a sheet - the printed margins sample
pure white.

**`body` is `display: flow-root`, and removing the masthead is what exposed
why.** `html` is painted with the brand ink so the full-bleed reel never
flashes white. With the bar gone the plate became the first child, and its
2.25rem top margin collapsed straight out of the body box - dropping the body,
and its mist, 36px down the page and leaving a black band across the top. The
masthead had been preventing that by being a non-margin first child, so this
was a latent bug the removal revealed rather than one it caused.

**The footer is the only shared chrome, and the lockup finishes its
sentence.** "Built with ❤️ by the community at" *[Seattle Makers]* - which is a
better reason for a logo to be on a page than "this is a website". It is
`grayscale(1)` at 42% so it settles into the ground instead of sitting on it;
at full strength the green pulled more attention to the bottom of the page than
the tools above it. Full colour on hover and focus, because it is a link, and
it carries the only outbound link to seattlemakers.org.

**The repo link under it points at public source.**
`hankfoot/seattle-makers-tools` was private when the link was added, so it
404d for visitors; it was made public on 2026-09-19 rather than the link being
removed. Before that flip the whole history was scanned for anything that
should not ship - tracked filenames, every blob ever committed, and the list of
files deleted along the way. It came back clean: `wrangler.toml` carries no
account id or bindings, there are no `.env` files, and the only matches for
"secret" were HANDOVER.md saying there are none, a transitive dependency called
`@azure/keyvault-secrets`, and a `.gitignore` line. Worth repeating that scan
before making any other project here public - deleted files stay in history,
and going public publishes the history, not the checkout.

**The artwork there is the one-line "Skinny" variant at 1.15rem** (1.05rem
below 40rem), about 146px wide - three quarters of the line of text above it,
which reads as a sign-off rather than as a second logo. The stacked "No
outline" lockup was tried at this size and is worse: stacked, a footer-sized
mark puts "SEATTLE" on its own line at about 9px and it goes fuzzy, where one
line buys roughly double that letter height for the same footprint. The
keyline on the Skinny variant was the argument for "No outline" - under
`grayscale()` a black outline round a grey fill can read muddy - and at 18px
it simply does not show.

**`.sm-footer-logo img`'s breakpoint override must sit below the base rule.**
It was written into the `@media (max-width: 40rem)` block next to `.sm-sheet`'s,
about 80 lines *above* the rule it overrides; media queries do not raise
specificity, so the base rule won on source order and the logo rendered at its
desktop height on a phone. Nothing looked broken enough to catch without
measuring it.

**On mobile the sheet needs an explicit side margin, not `auto`.** Below the
breakpoint it is wider than its own `max-width`, so `margin: 1rem auto`
collapses the side margins to zero and the card sits flush against both window
edges with its rounded corners cutting into nothing.

**`.sm-foot` has no rule of its own.** Both pages that use it put it under a
hairline-ruled list, so the list's closing rule was already the divider and the
footer's added a second one. Widening the gap between them made it worse, not
better: an empty band between two full-width hairlines reads as a blank row in
the list. Space alone separates it now.

**The availability chip is the exception, and that is the point.** Every row
has a kind, so chipping all of them would be a wall of chips carrying no
information. Whether you can still get in is true of some rows only, so it gets
the tinted pill and is findable at a glance from a few metres - which is the
distance this board is actually read from.

**The refresh lightens `--color-sm-mist`, which the reel also uses.**
`EventSlide` paints with `bg-sm-mist`, so its plates lifted `#E5E5E5` ->
`#F2F4F2` along with everything else. That is consistent rather than
accidental - it is one token - but it is a change to a page that is otherwise
deliberately frozen, and it is the only one.

### The board

**The feed's `end` is not the session's end, and this is the single thing here
most likely to bite someone.** A multi-part course carries the end of its
*last* session: "Woodshop Basics (4 Part Series)" runs
`2026-09-09T18:30 -> 2026-09-30T21:30`. Taken literally, that event is "on now"
for three weeks and owns the top of the board every day for a month.

The clock time survives the encoding, though - `18:30 -> 21:30` is the real
three-hour session with the series' final *date* stamped on it. So
`sessionEnd()` puts the end's clock time on the start's date. Checked against
the whole calendar rather than assumed: all 8 multi-day rows imply a sane 2-3h
session that way, and the one with a same-title single-day twin ("CNC
Certification Series") implies 2.0h against a twin that runs exactly 2.0h. 130
of 142 events are under four hours, so the rule only fires on the handful that
need it.

**`lib/day-status.ts` imports no data, and that is the point.** `lib/events.ts`
pulls `events.json` - 72K - so `scripts/today.ts` cannot touch it without
dragging the whole calendar into the browser bundle, which is exactly what the
live fetch exists to avoid. A data-free module lets the build-time render and
the runtime re-render share one implementation instead of keeping two copies of
the same rules in step by hand. `npm test` covers it: 26 assertions, no
framework, Node strips the types.

**`refresh()` and `tick()` are separate on purpose.** Refresh (5 min, network)
changes *what* is on. Tick (30s, no network) changes *where the day stands* -
past / live / next / later - which is what makes this a live view rather than a
list that reloads. Tick mutates in place rather than re-rendering: rebuilding
would throw away the progress bar's CSS transition twice a minute and fight any
text the viewer has selected. Verified by stubbing the clock 90 minutes forward
and waiting one real tick - the two live rows went past, their badges and
progress bars were removed, and the "checked" stamp did **not** change, which
is the proof no fetch was involved.

**Exactly one row is ever `next`.** "Up next" has to mean one thing on a board,
or it is a synonym for "not yet" repeated down the page.

**The fit is what makes a wall screen possible, and what it gives up is
ordered.** A TV cannot be scrolled, so anything past the bottom edge is
invisible with no way to reveal it - worse than absent, because the board
silently looks like the day ends early. `fit()` hides rows until the list fits:
finished events first (oldest first), then the far end of the day (latest
first), and **never the live row or the next one** - those are the two facts
the board exists to show. Rows are hidden rather than removed, so the next pass
can bring them back without a re-render.

**Display mode's thresholds sit deliberately above a tablet.** Portrait, at
least 700px wide *and* 1200px tall - an iPad Pro 11" is 834x1194 and so stays a
normal page. `?tv=1` forces it on and `?tv=0` off, which is how to check the
layout without a TV. Verified at 1080x1920: document height exactly equals the
viewport, so nothing scrolls.

**Type in display mode scales off `vh`, not `vw`.** The scarce axis on a
portrait screen is the vertical one; type sized off width overflows the very
screen it was written for.

**The dummy fixture is anchored to the build clock, not to fixed hours.** Pinned
at 09:00-19:00 it was a board of nothing but "finished" by evening - exactly
when someone is most likely to be checking that the live states work. The
anchor is clamped so the whole 10.5-hour schedule fits inside one day; clamping
each row individually instead piles three of them onto 23:30 with ends reading
"26:00", which is not a time and which `Date` silently rolls into tomorrow. It
also carries real durations and a series row now, because a fixture where every
`end` is null cannot exercise the rule at the top of this section.

**The stamp says "Last updated", and it still carries two different times.**
The wording changed; the structure did not, because collapsing them is how a
board quietly lies. When the Worker really did just scrape, the data and the
check are the same moment and one clock time says everything - "Last updated
9:22 pm". When it fell back to the baked calendar they are weeks apart, so both
appear: "Last updated 27 aug · checked 9:22 pm". With no `fetchedAt` at all we
do not know when the data changed, so it reports only "Checked 9:22 pm" rather
than guessing. An earlier version showed "updated 3:01 pm" off a five-minute
poll against a three-week-old file, which is the lie this split exists to
prevent - the new wording is the honest half of that sentence, not a return to
it.

**The debug panel is behind `?debug=1`, and `?now=HH:MM` works without it.**
Every state depends on the wall clock, so at 9pm every event is "finished" and
most of the board is unreachable. The panel sets the clock; the URL parameter
does the same thing as a link, so a particular state can be shared or
screenshotted. Malformed values are ignored rather than producing a board
pinned to `NaN`.

**`markSimulated()` is deliberately not part of `refreshDebug()`.** That
function returns early when the panel is not mounted, and `?now=` works without
`?debug=1` - so with the marker tied to the panel, a board opened on just
`?now=` showed a simulated day with nothing saying so. That is the single
outcome the red bar exists to prevent, and it was broken the first time.

### The rest

**`/today` is live via a Cloudflare Worker, not a rebuild.** The board
reads `/api/events`, which scrapes the calendar per request and returns JSON.
That is the only way a browser can have this data at all, and the reason is not
negotiable: seattlemakers.org sends no `access-control-allow-origin`, so a
fetch from the page fails before our code runs. Server-to-server has no such
rule. `worker/index.js` handles that one path and hands everything else to the
ASSETS binding, which serves the Astro build out of dist/, so Astro stays
`output: 'static'` - no adapter, no hybrid mode, nothing about the label maker
changes.

It was a Pages Function first. Cloudflare's git integration now creates Workers
rather than Pages projects and runs `wrangler deploy`, which wants a Worker
entry point - a Pages-shaped `functions/` directory fails the deploy outright
with "Missing entry-point to Worker script or to assets directory" *after* a
perfectly good build. Workers with static assets is also the platform
Cloudflare is actually developing.

**One parser, used from two runtimes.** `src/lib/parse-calendar.mjs` is pure
string-handling - no fs, no Node built-ins - because a Workers runtime has
none. The scraper runs it and writes a file; the function runs it and returns a
response. Everything in fetch-events.mjs that touches disk (summary and picture
enrichment) stayed behind, which is why live rows have no picture and only the
summaries that could be grafted on from the baked data by title - 83 of 166 at
the time of writing. That graft is now the *only* thing the Worker reads
`events.json` for: it is content rather than freshness, a description ages far
more slowly than a schedule, and a missing one costs a line of text rather than
making the board wrong.

**There is no fallback calendar any more, and that is the point.** The Worker
used to answer a failed scrape with the build-time copy of the calendar,
stamped with its own old date. Honest, but the file only refreshed when
somebody ran `npm run events`, and nobody did - so the safety net was a
schedule from weeks earlier, and the board spent its life showing it. It was 24
events behind when this was removed.

A failure is now reported as one: `{ ok: false }` with a 502, and the board
says "Cannot reach the calendar right now." What must never happen is an empty
list with `ok: true` - the board would render "Nothing on the calendar today",
which is a confident lie about the space rather than an admission that we could
not look. `today.ts` checks `ok === false` explicitly for that reason, and its
empty state has two different sentences depending on which happened.

The `live` flag survives for the same reason the two-part stamp does: it is
what stops a future fallback being reported as fresh.

**Nothing but `npm run serve` exercises the API locally.** `astro dev` and
`astro preview` serve static files, so `/api/events` 404s under both and the
board silently falls back to the baked `/events.json`. Every local check
therefore shows a stale board with a "Last updated 27 aug"-style stamp, which
reads exactly like the live path being broken. It is not - verified through
`wrangler dev`: the API returns `live: true`, 166 events against the baked
142, and 3 events today against the baked 2, and the board's stamp becomes
"Last updated 9:41 pm". Do not conclude anything about freshness from a
preview server.

**The today board's live data must come from our own origin.** The browser
cannot fetch seattlemakers.org/events: it returns 200 with no
`access-control-allow-origin` (checked with an `Origin:` header, not assumed),
and there is no API behind it - the same dead ends the scraper found. So
`/today` fetches `/events.json`, a prerendered copy of this repo's calendar.
That endpoint is the seam: a scheduled rebuild now, or a proxy function later,
changes what is behind it without the page changing. "Live" therefore means *as
fresh as the last build*, and calling it anything else would be a lie.

**There is no build-time render of the board.** `/today` used to ship the
day's events in its HTML as a floor under the fetch. They came from the baked
calendar, so the floor was a schedule from weeks earlier presented as today,
for however long the first fetch took - and forever if JS never ran. It now
ships an empty list and says "Checking the calendar…", which is true.

The cost is real and accepted: with no JS there is no board at all. The board
already depended on JS for every refresh, so this trades a wrong answer for no
answer.

**`today.ts` imports only the `SmEvent` *type* from lib/events.** Importing the
module pulls `events.json` - 72K - into the client bundle, which is precisely
what the fetch exists to avoid. The formatters in it are duplicates of the
library's on purpose; a type-only import is erased at build and costs nothing.

**`eventsOn` is deliberately unfiltered, unlike `pickByStudio`.** The reel's
`HIDDEN_KINDS` drops tours, open studio hours and orientations as operational
scheduling not worth advertising to a stranger at a market. A board inside the
space is the opposite case, and this is not hypothetical: today is a public
tour and a new-member orientation and nothing else, so applying that filter
would have shipped an empty board.

**`?src=` accepts same-origin paths only.** It is how the dummy calendar is
tested, but an absolute or protocol-relative URL is rejected in favour of the
real feed - otherwise the query string would be a way for anyone with the link
to put arbitrary text on a screen in the space. Scraped titles and summaries go
in with `textContent`, never `innerHTML`, for the same reason.

**The label geometry was measured, not guessed.** `src/data/labelSheets.ts`
carries numbers read out of the LibreOffice templates: page size and margins
from `styles.xml`, label size and gutters from the table column/row sequences in
`content.xml`. Do not round them - 2.5x1.56 stock is really 1.5632in tall.
Parsing trap: the column and row sequences **alternate label cells with gutter
cells**, so a naive count says 5 across when it is 3, and the 2.5x1.56 vertical
has columns of 1.5618in and 1.5597in - a 0.002in difference that a
widest-value heuristic mistakes for a gutter. Cluster with a tolerance.

**Every label sheet prints portrait, including Upright.** The paper is portrait
and the die-cut does not move, so Upright is the same portrait sheet with the
content turned a quarter turn inside each label - not a landscape page. Checked
before relying on it: rotating each landscape template 90 degrees clockwise
lands on the same rectangles as its portrait counterpart (8x5 exact, the others
within 0.009in, which is the template author's own rounding). Clockwise is also
what makes the words read the same way the landscape template does. The win is
that the preview always looks like the sheet in your hand and there is one feed
orientation rather than two. A `w x h` content box rotated 90deg occupies
`h x w`, which is exactly the die-cut rectangle, so the two can never disagree.

**A column-flow label must not let `.lb-text` grow.** In a column the main axis
is vertical, so `flex: 1 1 auto` makes the text box swallow all the leftover
height and pin the code to the top - which reads as "not centered" while
`justify-content: center` is sitting right there looking correct. `flex: 0 0
auto` lets the pair size to its content so centring works.

**OpenCV's `detectAndDecodeMulti` misses large codes on a full sheet.** Two 3.68in
codes on an 8x5 upright sheet came back as one, which read as a print defect and
was not - each decodes perfectly when its own label is cropped out first. Verify
label QRs one cell at a time.

**Measuring a rotated element needs `offset*`, not `getBoundingClientRect()`.**
The latter returns the axis-aligned box of the *transformed* element, which made
an 8x5 upright label report a 5in-tall content box instead of 8in and its
centring look like zero.

**Horizontal and Vertical are the same physical sheet.** The 8x5 portrait layout
(1 across, 2 down) and the 5x8 landscape layout (2 across, 1 down) put ink on
identical die-cut rectangles; only the content turns. That is why each pair has
the same count, and why picking the wrong one cannot waste a sheet.

**The label page is `@page { margin: 0 }` and absolutely positioned**, rather
than laid out inside the page's content box. A die-cut does not move, so
the grid is placed in absolute inches from the physical page corner. The cost is
that the sheet is full-bleed and Chrome's "fit to printable area" would ruin it,
hence the explicit Margins: None / Scale: 100 instruction in the UI.

**One label is the base case, not a full sheet.** People come here to make one
tool tag or one bench label; filling the sheet is the exception and is one click
away. The default selection is a single position, and `?on=` names positions to
print (it replaced `?off=`, which only made sense when the default was a full
sheet).

**The three position states have to be tellable apart at a glance** - getting it
wrong wastes a sheet of stock. Printing is white with a solid green edge and a
green number; not printing is grey and dashed with the content ghosted to 13% so
you can still picture what would land there; hover washes green either way. All
of it, numbers included, is `@media screen` - verified by printing a partial
sheet and confirming every skipped cell is pure white.

**Align the code's ink, not its box.** The encoder bakes a 4-module quiet zone
*inside* the image, so a QR box flush against the padding puts its visible ink
another quiet zone further in - 0.29in on an 8x5, which made the left margin
roughly double the right and the gap to the words read 0.64in against the 0.35in
declared. `--quiet-pull` drags the box out by the quiet zone so the ink lands on
the padding line. It is capped at the padding, because past that the box would
hang over the label edge; the quiet zone stays satisfied either way, sourced
from the label's own white rather than from inside the image. Short links are
the stress case, not long ones - fewer modules means bigger modules means a
wider quiet zone in inches.

**Stock with no upright variant *becomes* Across, it does not merely display as
Across.** The control stays visible and greys out rather than disappearing, and
the forced value is written into state so moving on to a stock that does offer
upright does not silently spring back to a setting the previous sheet could not
honour.

**Label alignment defaults from the content but can be overridden.** Auto reads
best for a title-and-subtitle label: center everywhere except a code sitting
*beside* the words, where a centered column drifts away from the code and the
label stops looking like one object. But auto cannot know the copy is a
checklist, which wants a left edge whatever the code is doing - so Auto is the
default, not the verdict, and Left/Center override it.

**Type starts 15% smaller when there is a code**, because the code takes about a
third of a wide label's width or a good part of a tall one's height, and type
calibrated for the whole label is too assertive for what is left. The
readability clamp still wins: applying the reduction after the clamp pushed the
4x1 strip to 11.9pt, under the 14pt floor the clamp exists to hold.

**`TITLE_MIN` is the 4x1 strip's real size, not a safety net.** It is the only
stock whose proportional size lands under the floor, because the size follows
the short side and a 4x1's short side is 1in - which ignores the 4in of width
sitting next to it. At 14pt that label used a quarter of its usable height with
a title alone; 20pt fills it and still leaves room for a subtitle and a code.

**Height is measured against the text's own budget, and `scrollHeight` cannot do
it.** Two traps here, both found on the small stock:

- `scrollHeight` reports overflow *downwards only*. The content is vertically
  centered, so when it is too tall it spills equally above and below and
  scrollHeight under-reports by half - a 2.5x1.56 sat at 102% of its usable
  height, eating into the padding, and still passed. Compute the content height
  from the flex layout instead, with `offset*` (rotated labels make
  `getBoundingClientRect` the axis-aligned box of the transform).
- The `FILL_MAX` target applies to the **words**, never to the words plus the
  code. On a 4x1 the code is sized to exactly the usable height, so a target
  under 100% could not be met however small the type went - the search ran to
  its floor and printed a 5pt title. Shrinking text cannot shrink a fixed-size
  code, so the code has no business being in that test.

**Title and copy never scale together - each shrinks for its own reasons.** One
shared factor was wrong in both directions: a long title took "Certification
required" from 17pt to 12.6pt without a word of it changing, and a long
subtitle pulled a 20pt title down to 13pt.

- **Width** is fitted separately. How wide the title runs says nothing about how
  big the copy should be.
- **Height** is shared, but sharing it does not mean splitting the cost.
  Running out of room is almost always the copy's doing, so the copy gives way
  first, alone. Only when it has hit its 6pt floor does the title come down, and
  it comes down on its own too - scaling the pair would push the copy *under*
  that floor to buy height the title could have given up instead.

`MIN_LEAD` is re-applied after the title shrinks, so a title cut down hard
cannot end up level with its own subtitle.

**One ratio between label title and copy (1.8), never two clamps.** Clamping the
two sizes independently let the clamps decide the relationship - it came out at
2.7x on the 8x5 board and 2.1x on the 4x1 strip, so the same words looked
differently balanced on every stock. Only the title is clamped now; the subtitle
is derived, so the ratio survives whatever the auto-fit does.

**The auto-fit's width test must be exactly `scrollWidth <= clientWidth`.** Both
fudges have been tried and both failed loudly: `+ 1` absorbed a real overflow
(130 in a 129 box passed as "fits", and ink printed into the margin), and `- 1`
can never be satisfied at all, because text that fits reports the two as equal -
that collapsed every label to the 6pt floor. Glyph side bearings get their room
from a 0.02in inset on `.lb-text` instead: a layout allowance, not a fudged
comparison.

**`.lb-text` needs `width: 100%`, and it is load-bearing.** As a column-flow flex
item without it, the text box sizes to its own content, so scrollWidth can never
exceed clientWidth, the auto-fit has nothing to measure, and the words run off
the label.

**The shaded code box needs `print-color-adjust: exact`.** Browsers do not print
backgrounds unless the viewer ticks "Background graphics", so without it the box
shows on screen and vanishes on paper. It is set on the `code` element alone,
so the rest of the sheet stays ink-free and photocopy-friendly. Checked by
printing and looking for the grey block, not by assuming.

**The subtitle editor is Quill**, restricted to bold / italic / code / lists -
exactly what `clean()` allows, so it cannot offer a format that would be
stripped back out. Two traps, both of which fail silently:

- **Build the toolbar buttons before constructing Quill.** Its toolbar module
  scans the container once, at construction; buttons appended afterwards get no
  handlers and every format quietly does nothing.
- **Read `getSemanticHTML()`, not `root.innerHTML`.** Quill marks bullet lists
  as `<ol data-list="bullet">` internally and draws them with CSS, so the raw
  DOM would print every bullet as a number. The semantic form also emits
  non-breaking spaces between words, which `clean()` converts back - left in, a
  subtitle refuses to wrap and just overflows the label.

**Label padding is a 0.1in floor that scales up, per axis.** 0.1in is the registration
allowance - protection against the sheet feeding slightly out of true - and that
error is the same size on a 4x1 strip as on an 8x5 board, so it must never scale
below it. Above the floor it is an optical margin and does scale.

It scales *per axis*: side margins from the width, top and bottom from the
height. Driving both from `min(w, h)` gave a wide label narrow side margins -
0.15in on a 4in-wide 4x2.5 - which is what made the code and the words look
jammed against the edges. The trade is a narrower text column, so a two-word
title may now wrap where it did not.

**Everything on a label hangs off one left margin**, in both flows, so the code,
title and subtitle start on the same vertical line. Titles use `text-wrap:
pretty` rather than `balance` - balance evens the line lengths, which reads as
ragged against a hard left edge.

**Label type auto-fits by measuring the title, not its wrapper.** A wrapper that
has already wrapped reports no overflow, so the first version of this shrank
nothing and "Woodshop" printed as "Woodsho / p". `.lb-title` therefore sets
`overflow-wrap: normal` so an oversized title genuinely overflows. The search is
a binary search on a single scale factor over 12 reflows, rather than fixed
percentage steps: it lands on the largest size that fits instead of overshooting
by up to a whole step, and scaling one factor keeps the title/copy ratio intact.

**The label fit is line-aware, not just size-aware.** A QR takes a third of a
wide label, and the title was being *wrapped* into what was left rather than
sized for it: "Laser Cutter" came out as two big lines beside the code while the
plain version sat happily on one. Shrinking type fits more characters per line,
so line count is searchable - the fit asks first for the title to take only the
lines the copy asked for (one, plus any typed breaks), accepts that unless it
costs more than a third of the size, then allows one extra line, then just fits
the box. On a 4x2.5 that trades 7% of the type size for one line instead of two.

**Base rules must sit above the breakpoint that overrides them.** `.lb-col` gets
`display: contents` inside the max-width block so the sheet can be ordered
between the fields and the Print button, but the desktop `display: flex` was
written after it in the source - same specificity, later wins, and the reorder
silently did nothing. Nested media queries do not raise specificity.

**`align-items: flex-start` on a stacked layout overflows the window.** Both tool
pages are a two-column flex row that becomes a column below a breakpoint. In a
column container `align-items` governs *width*, so the flex-start inherited from
the row layout made the preview size to its own content - 816px of sheet inside
a 345px window, overflowing sideways instead of scaling. The stacked media query
has to set `align-items: stretch` and give the preview `width: 100%`. This is
the same trap as the `.lb-text` note below, one level up: a flex item in a
column container sizes to content unless told otherwise.

**Never height-test `.lb-text` in the fit.** It is a shrink-to-fit flex item, so
its clientHeight *is* its content height and the two differ only by sub-pixel
rounding - a difference that grows with the font size until it trips any
tolerance. Testing it dropped an 8x5 title from 54pt to 9.7pt whenever there was
no subtitle, because a subtitle happened to round the discrepancy away, which
made it look like a bug about missing subtext. Height belongs to `.lb-inner`,
which has the label's real height.

**The label title is plain text; only the subtitle is rich.** Bold and italics
do nothing for a phrase that is already the largest, heaviest thing on the
label, and a line break only invites the copy to grow. It also means the fit can
assume the title wants exactly one line.

**List markers on a label are drawn by hand, not by `list-style`.** The gap after
a native marker is not controllable and comes out far too wide at label sizes,
and a marker outside the text flow cannot be centered - a hanging indent needs a
left edge to hang from. `li::before` with a counter for ordered lists solves
both.

**Label copy is rich text, sanitised to `b` / `i` / `br` / `code` / `ul` / `ol` /
`li`.** `clean()` unwraps
everything else, turning block elements into line breaks so text does not run
together, and *deletes* `script`/`style` and friends outright - unwrapping those
would keep their text, so a pasted script tag became label copy reading "bad()".
Paste is forced to plain text as well. `execCommand` is deprecated but remains
the only one-liner that toggles bold/italic over a selection; its output goes
through `clean()` regardless, so its quirks cannot reach the label.

**`render()` in labels.ts takes a generation ticket.** It awaits the encoder, so
two renders can be in flight and the slower can land last - typing across three
fields quickly was enough to leave a stale QR on a label whose link had been
cleared.

**The event scrape is the fragile part.** There is no usable API - WP REST and
`/wp-json/` 401, `?ical=1` returns HTML, and `/events/feed/` carries post-publish
dates rather than event dates. The calendar page is the only public source of
real event times, and it hands over ~a year in one GET. The scraper exits
non-zero on a zero-event parse and leaves the previous JSON in place, so a site
redesign breaks the refresh loudly instead of quietly emptying the reel.

**Times are stored as floating local strings** (`"2026-09-05T13:00"`), not UTC
instants. The calendar publishes wall-clock Seattle time and the market PC runs
in Seattle, so this renders exactly what the site says and sidesteps timezone
conversion entirely. It also means plain string comparison sorts and filters
correctly.

**Event cards carry several occurrences and the browser picks.** The site is
static, so without this a build from last week would advertise a class that has
already run.

**Do not use `translate3d` in the Ken Burns keyframes.** It promotes the image
to its own compositor layer, which some capture and remote-display paths render
as solid black. The 2D form is deliberate.

**Event pictures are filtered by compression density, not size.** The site's
per-category logo tiles arrive at the same 1220px as real class photos, so width
cannot separate them. Flat artwork compresses to a fraction of what a photograph
needs: measured across the calendar, logo tiles land at 0.018-0.054 bytes/px and
every real photo at 0.080+, so `MIN_BYTES_PER_PIXEL = 0.06` splits them cleanly.
Dimensions come from parsing the JPEG SOF / PNG IHDR header directly, which
avoids pulling in an image library for two numbers.

**Print geometry is sized in inches, and that is the whole trick.** CSS pins
`in`/`pt` to 96px/in on screen and to real physical units in print, so one
element is simultaneously the preview and a true-size print - there is no second
set of measurements.

**Preview scaling is `transform`, never `zoom`.** `zoom` re-lays-out text at the
scaled size, so preview line breaks would diverge from print and it would stop
being a preview. The cost is that a scaled element keeps its unscaled layout
box, so `labels.ts` sets `#preview-host`'s height by hand.

**Print QR settings deliberately differ from the reel's** (`scripts/make-qr.mjs`):
`#000000` not `#111111`, because brand ink is not single-channel black and
drivers render it as a four-colour composite that fuzzes every module edge;
`margin: 4` not `1`, because `1` is out of spec and only survives on a huge black
field; and error correction `M` not `H`, because `H` costs 30-40% more modules
for the same payload, which means *smaller* modules at a fixed physical size -
the real limit on the 2.5 x 1.56in stock. `H` was right for the reel: glare at an
angle. It is wrong on paper.

**Two things in this repo print badly without an explicit reset.**
`global.css` sets `html { background: var(--color-sm-ink) }`, which prints as a
solid black page whenever "Background graphics" is ticked, and `Base.astro` puts
`min-h-screen` on `<body>`, which is `100vh` in print and emits a blank second
page. Both are forced back in `labels.astro`'s `@media print`.

**Astro scoped styles cannot reach the injected QR.** Scoped `<style>` adds a
build-time data attribute that elements created by `innerHTML`/`cloneNode` never
receive, so a scoped `.p-qr svg` rule silently fails to match. The sheet CSS is
`<style is:global>` for this reason. Relatedly, `svg-tag.js` bakes in
`shape-rendering="crispEdges"`, which is right at 600dpi and wrong in a
scaled-down preview where it makes module rows look uneven - overridden to
`geometricPrecision` under `@media screen` only.

**Astro eats whitespace at element boundaries across a line break.** `and leave\n<b>Scale</b>`
renders as "leaveScale". Keep `<b>` flush against its neighbouring text.

**The silent QR failure is modules too small to scan**, not anything visible.
`print-qr.ts` parses the `viewBox` back off the SVG the encoder just produced,
works out mm per module, and warns below 0.8mm / errors below 0.5mm. Calibration: a
155-char URL on a 2.25in card is 0.88mm and decodes 4/4 from a 300dpi *and* a
150dpi raster, so the threshold is not alarmist.

**Cancelled classes are only signalled in the title.** Organisers edit
"(CANCELLED)" into the event name rather than removing the event, so
`src/lib/events.ts` matches that string.

**`[hidden]` needs a global override.** Tailwind's display utilities outrank the
UA stylesheet's `[hidden]` rule, so a `flex` element with the `hidden` attribute
stays visible. `global.css` forces it. This bites the event card, whose
occurrence options are flex rows toggled by `hidden`.

**Google Photos album extraction.** The share page embeds its list as JSON in
the `AF_initDataCallback` block keyed `ds:1`; records are
`[id, [url, w, h], takenMs, ...]` and `url + "=w2400"` fetches full size. Two
traps: **video records come back with a play button burned into the thumbnail**
(detect them by the key `76647426` in the record's trailing dict - 26 of 300),
and **only the first ~300 records are embedded**, newest first, so anything
older than the last one needs the continuation token in `data[2]`.

**Lazy images need explicit warming.** A lazy image inside a slide sitting at
`opacity: 0` may never load on its own, which shows as a slide fading in with a
hole in it. `slideshow.ts` warms the current and next slide, then the whole reel
in the background.

## Verifying

Printing is checked headlessly with Chrome's `--print-to-pdf`, then the PDF is
rasterised and measured - sheet size and orientation, ink inside every die-cut
rectangle, nothing in a margin, codes decoded one cell at a time. That catches
geometry, and it is worth trusting.

**It does not touch the Print button.** It loads a URL and prints the page, so
the button, its disabled state and every other control are invisible to it - a
commit once removed the click handler outright and every print check still
passed. Click the thing as well. Stubbing `window.print` makes that safe to
automate:

```js
let called = 0; const real = window.print; window.print = () => { called++; };
document.getElementById('f-print').click();
window.print = real;
```

## Keeping this file current

When something is learned the hard way, it belongs here under *Implementation
notes* or in a comment next to the code - mechanism, derivations, how an
investigation went, a decision that reversed, a constant that only means
something inside this project. Most of this file is that, and it is the reason
a change that looks obviously right often is not.

The bar is whether it would save the next person the hour it cost you. A note
that only records what the code already says plainly is not worth the space.
