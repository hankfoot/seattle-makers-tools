# CLAUDE.md — seattle-makers-tools

> Read this fully at the start of every session.

## What this is

A suite of small web tools for Seattle Makers, served as one static site.
A looping **slideshow** for markets and tabling events, and a **QR sign
generator** for printed signage.

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
  (The `/qr` tool does encode in the browser - see below. Astro splits scripts
  per page, so the reel's bundle is unaffected.)
- The Interbay map is gone - it was inaccurate, and at a market the scannable
  thing is worth more than the map anyway.

QR sign generator (`/qr`) is built and verified against a print-to-PDF.

Done:
- Link + title + description -> a printable sheet at full page (7.25 x 10in),
  half (7.25 x 4.75in) or card (3.625 x 5in), one centred or tiled to fill the
  sheet (2 halves, 4 cards) with cut lines.
- Browser print only - no PNG/SVG/PDF export, no persistence, no backend.
- `?url=&title=&desc=&size=&copies=&cut=&showurl=` prefills the form. Not
  persistence: it makes one sign reproducible and is what lets the print
  verification run headless.
- The sheet is an editorial layout: masthead (tracked small-caps eyebrow over a
  title ruled above and below), code + description in the middle band, imprint
  line at the foot. Black only, on purpose - it photocopies, and the hierarchy
  is carried by size, weight, tracking and air rather than colour.
- Editor chrome echoes the index page (lowercase lockup, 4px green rule) and
  the preview shows the whole 8.5 x 11in sheet rather than just the printable
  area, so the margin you get is the margin you see. The dashed printable-area
  guide and the empty-state wording are `@media screen` only - verified by
  printing with cut lines off and confirming the boundary rows are pure white.
- `npm run check` now actually runs; `@astrojs/check` and `typescript` were
  never installed, so the script had only ever prompted to install them. It
  reports 8 pre-existing errors in the slideshow (a `status` global collision,
  `hidden` on SVGElement, two boolean coercions). Not touched here.

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

**The QR sheet is sized in inches, and that is the whole trick.** CSS pins
`in`/`pt` to 96px/in on screen and to real physical units in print, so one
element is simultaneously the preview and a true-size print - there is no second
set of measurements. The sheet is the `@page` *content box* (`margin: 0.5in`),
never a full-bleed 8.5x11: printers have a ~0.25in unprintable edge, Chrome's
"fit to printable area" silently shrinks anything that overflows (which would
destroy true size), and a page-height element is the classic trailing blank
page. The grid is held to **7.25in**, not the full 7.5in, so an A4 printer
(7.27in printable at these margins) does not trigger shrink-to-fit either.

**Preview scaling is `transform`, never `zoom`.** `zoom` re-lays-out text at the
scaled size, so preview line breaks would diverge from print and it would stop
being a preview. The cost is that a scaled element keeps its unscaled layout
box, so `qr.ts` sets `#preview-host`'s height by hand.

**Card copies tile with no gutter.** Two 5in cards plus any gap exceeds the 10in
sheet, and CSS grid responds by *silently squashing* the cards rather than
overflowing - measured at 4.89in instead of 5in before this was caught. 3.625 x
5in at `gap: 0` divides 7.25 x 10in exactly, and adjacent cut lines land on top
of each other, which is what you want when trimming a stack.

**Print QR settings deliberately differ from the reel's** (`scripts/make-qr.mjs`):
`#000000` not `#111111`, because brand ink is not single-channel black and
drivers render it as a four-colour composite that fuzzes every module edge;
`margin: 4` not `1`, because `1` is out of spec and only survives on a huge black
field; and error correction `M` not `H`, because `H` costs 30-40% more modules
for the same payload, which means *smaller* modules at a fixed physical size -
the real limit on a 2.25in card. `H` was right for the reel: screen glare at an
angle. It is wrong on paper.

**Two things in this repo print badly without an explicit reset.**
`global.css` sets `html { background: var(--color-sm-ink) }`, which prints as a
solid black page whenever "Background graphics" is ticked, and `Base.astro` puts
`min-h-screen` on `<body>`, which is `100vh` in print and emits a blank second
page. Both are forced back in `qr.astro`'s `@media print`.

**Astro scoped styles cannot reach the injected QR.** Scoped `<style>` adds a
build-time data attribute that elements created by `innerHTML`/`cloneNode` never
receive, so a scoped `.p-qr svg` rule silently fails to match. The sheet CSS is
`<style is:global>` for this reason. Relatedly, `svg-tag.js` bakes in
`shape-rendering="crispEdges"`, which is right at 600dpi and wrong in a
scaled-down preview where it makes module rows look uneven - overridden to
`geometricPrecision` under `@media screen` only.

**The middle band is `flex: 1 0 auto`, never `1 1 auto`.** It has to grow into
the space between masthead and imprint, but it must not *shrink*: a shrinking
band silently absorbs text that does not fit, which would defeat the
`scrollHeight > clientHeight` overflow check and print a clipped card with no
warning.

**`text-wrap: balance` on the title and description** is what stops a card
description breaking as one full line plus a one-word orphan. Chrome honours it
in print, which is the only renderer that matters here.

**Astro eats whitespace at element boundaries across a line break.** `and leave\n<b>Scale</b>`
renders as "leaveScale". Keep `<b>` flush against its neighbouring text.

**The silent QR failure is modules too small to scan**, not anything visible.
`qr.ts` parses the `viewBox` back off the SVG the encoder just produced, works
out mm per module, and warns below 0.8mm / errors below 0.5mm. Calibration: a
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
