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

Slideshow tool is built and verified against a production build.

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
- Everything on today's calendar, with kind, fullness and cancellation, from a
  build-time render that a client-side refetch replaces. Refreshes every five
  minutes and on `visibilitychange`.
- `/events.json` and `/events-dummy.json` are prerendered endpoints, not files
  in public/. The dummy's dates are generated at build time, so it is always
  "today" rather than a fixture that rots.
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

Next:
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

**`/today` is live via a Cloudflare Pages function, not a rebuild.** The board
reads `/api/events`, which scrapes the calendar per request and returns JSON.
That is the only way a browser can have this data at all, and the reason is not
negotiable: seattlemakers.org sends no `access-control-allow-origin`, so a
fetch from the page fails before our code runs. Server-to-server has no such
rule. `functions/` is served next to the static build by Pages, so Astro stays
`output: 'static'` - no adapter, no hybrid mode, nothing about the label maker
changes.

**One parser, used from two runtimes.** `src/lib/parse-calendar.mjs` is pure
string-handling - no fs, no Node built-ins - because a Workers runtime has
none. The scraper runs it and writes a file; the function runs it and returns a
response. Everything in fetch-events.mjs that touches disk (summary and picture
enrichment) stayed behind, which is why live rows have no picture and only the
summaries that could be grafted on from the baked data by title - 83 of 166 at
the time of writing.

**Both the function and the board refuse to claim freshness they do not have.**
The envelope carries `live`, set only when the scrape actually succeeded; the
static fallback has no such field and so can never accidentally assert it. On
any failure - bad status, network error, or a zero-event parse, which means the
markup moved rather than that nothing is on - the function returns the *baked*
calendar with the *baked* `fetchedAt`, so the footer reads "calendar 27 aug"
rather than today. The board shows "live · checked 3:10 pm" or "calendar 27 aug
· checked 3:10 pm", never one dressed as the other. An earlier version showed
"updated 3:01 pm" off a five-minute poll against a three-week-old file, which
is exactly the lie this structure exists to prevent.

**The today board's live data must come from our own origin.** The browser
cannot fetch seattlemakers.org/events: it returns 200 with no
`access-control-allow-origin` (checked with an `Origin:` header, not assumed),
and there is no API behind it - the same dead ends the scraper found. So
`/today` fetches `/events.json`, a prerendered copy of this repo's calendar.
That endpoint is the seam: a scheduled rebuild now, or a proxy function later,
changes what is behind it without the page changing. "Live" therefore means *as
fresh as the last build*, and calling it anything else would be a lie.

**The board renders at build time and the fetch only ever replaces it.** Every
failure path in `today.ts` is a deliberate no-op - bad status, bad shape, no
network - because a screen by the door showing an older day beats one showing
an error. The one case it does speak up is when the *day has rolled over* and
the refetch failed, which is the only state where what is on screen is actually
wrong rather than merely old.

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

## Logging what you learn

When something comes up that passes **"will this be useful to me in the future?"**, run **`/log`** — it routes the finding onto wiki and project pages in the vault.

Five shapes of yes:

- **Generalizable knowledge** — "here's how to estimate power for LEDs"
- **Tool quirks and patterns** — "here's how to flash a board with CircuitPython"
- **Parameters and paradigms that worked** — "here's a good tolerance for fitting dowels to 3D-printed parts"
- **Pitfalls to avoid** — "when using pygame, don't do X"
- **Project record** — what you used and what it cost

**Everything else stays here.** Mechanism and derivations, how an investigation went, decisions that reversed, constants that only mean something inside this project, this codebase's wiring — that's implementation detail. It belongs in this file under *Implementation notes*, or in a comment next to the code. `/log` will offer to put it here when it doesn't clear the bar.

Write vault entries as **flags, not explanations** — one line, terse enough to scan, specific enough to act on.

Nothing is captured automatically and there is no scratchpad. If `/log` isn't run, the session leaves nothing behind.

Use **`/quiz`** to test yourself on what's accumulated.

## Knowledge base

The vault at `../../../schmardware-vault/wiki/` accumulates findings, preferences, and reusable techniques across projects. **Check it before suggesting hardware/software choices** that might already be covered:

- `wiki/hardware/` — components, materials, tolerances, fabrication, suppliers
- `wiki/software/` — Fusion 360, PlatformIO, CircuitPython, dev tooling
- `wiki/game-dev/` — input, rendering, audio, physics, projection

When a relevant page exists, defer to the user's documented values and conventions. When your work surfaces something new (a measurement, a gotcha, a technique that worked or didn't), run `/log` to route it into the vault.

If the vault isn't reachable (project checked out standalone), proceed without it.
