# CLAUDE.md — sm-digital-toolbox

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
- Everything on today's calendar, with studio, kind, fullness and cancellation,
  fetched live from /api/events. Refreshes every five
  minutes and on `visibilitychange`.
- Each row carries the event's own picture where its page has one - about half
  of them do. See *Pictures* below.
- A help strip along the bottom: sign in at the check-in PC, and the shop
  number to call for a staff member in the building.
- The hero is a greeting, an instruction, and the two clock-like facts:
  "Welcome to Seattle Makers!" over "Please check in at the kiosk" on the left,
  the date over a live clock on the right. The lockup is down in the footer
  strip - see *The hero says the name* below.
- **Two row tiers, added 2026-09-22.** What is running and what is next get a
  big picture, the summary and room to breathe; everything else collapses to a
  one-line queue row. Finished rows are that same line, dimmed, with the
  picture dropped. See *Two tiers* below.
- **Plates on a ground, added 2026-09-22.** The board is mist and every event
  is a plate standing off it; the plate's material carries the status - faded,
  white, wash, lit green. No hairlines anywhere. See *Material is status*.
- The times are blocks now, not text on a rail: their own field of colour down
  the left of every plate, hour big and tabular over a small tracked meridiem.
- An ink strip at the foot, which is what makes the board one composed object
  rather than a panel that runs out of content.
- Three moving things, and no more: a status lamp on the "On now" countdown, a
  26s pan across the running class's own photograph, and the clock. See *What
  moves* below.
- `/events-dummy.json` is a prerendered endpoint, not a file in public/. Its
  times are generated at build time relative to the build's clock, so it is
  always "today" with something running rather than a fixture that rots.
  `/events.json` is gone - see *There is no fallback calendar* below.
- The slideshow is parked: its entry on the index is commented out, the page
  and `scripts/slideshow.ts` are untouched, and `/slideshow` still serves.
- **Deployed, and deploying again is a merge.** Cloudflare's git integration
  was reconnected to `seattlemakers/sm-digital-toolbox` on 2026-09-23 and a
  push to `main` built and shipped. Nobody needs `wrangler` or a Cloudflare
  login - see HANDOVER.md.

Studio calendar (`/calendar`) is built and verified against a print-to-PDF,
added 2026-09-20.

Done:
- A month of one studio's sessions on a letter sheet, for that studio's door.
  Landscape only, five weeks or six, from one flex column - see *The poster*.
- Reads `/api/events` once, whole, and filters in memory; every control after
  that is free. `?day=` is deliberately not passed.
- `lib/month.ts` is the pure half - month grids, compact times, the two title
  rules - with 51 assertions in `npm test`.
- A QR on the header's white card pointing at that studio's own events
  (`/events/types/<slug>/`), at 0.836mm per module, decoded at 150dpi and
  300dpi and checked against the address printed beside it.
- The whole sheet lives in the query string, so a studio can bookmark its own.

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

> Wants that are **not code** - content we'd like on the calendar, questions for
> the event coordinator, ideas without a shape yet - live in
> [WISHLIST.md](WISHLIST.md). Keep them out of this list: everything below
> should be work someone can pick up and finish in this repo.

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

(Event descriptions were on this list and are fixed - see *Descriptions* below.)

- Those 8 slideshow type errors.
- Photos for **leatherworking** and **a/v studio** - the only two studios still
  without any. Nothing suitable in the album's recent pages.
- 3d printing, cnc and laser cutting still show *certifications* rather than
  classes. That is the calendar, not the ranking: none of the three has an
  upcoming class, only certifications. Revisit when the calendar fills out.
- Drop the `50-deck-*.jpg` photos once every studio has enough current ones;
  they are of the old Wallingford space and only exist as a backstop.
- An icon for **leatherworking**. The brand's Illustrator master has no
  leatherworking mark, so it borrows sewing's - which means a class tagged only
  `leatherworking` shows a spool of thread. One such event is on the calendar.
- A calendar tag for **lapidary**, which is a real studio with a real icon and
  nothing on the schedule mapped to it. Belongs in WISHLIST as a question for
  the event coordinator rather than as code.
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

Sage sat in this table unused for months and became a real token on
2026-09-22, when /today's board grew an ink footer strip and needed the live
site's own colour for type on dark. It is still never used on white.

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

**Cancellation cuts across the four statuses rather than being one of them**,
so it overrides the plate instead of sitting in the ladder: a faint alert wash
for the plate, and the alert itself filling the time block - the position the
eye already uses to read this board's state.

The block is the signal, and the arithmetic is why. It is about 170px of colour
on a 1080 screen; the chip beside the title is about 90, and the rule through
the title is three pixels. At five metres only one of those carries.

**Everything on a cancelled row that is not saying "cancelled" goes grey.** The
kind label is normally brand green, and on the alert wash that put green type
next to red type - the Christmas pairing the palette note warns about, and the
one place on the board it actually happened. "TOUR" in green beside a CANCELLED
chip was the row that showed it. The studio goes grey with it: it is normally
ink to match the title, and a label left darker than the struck title it
belongs to reads as the more important of the two.

What is left is one red field and one red label on a grey row, which is the
whole point of the treatment. Checked by sampling every computed colour in the
row rather than by looking: no green remains, and the chip is the only red
text. A green "On now" countdown cannot turn up here either, now that
`statuses()` will not call a cancelled class live.

**The strikethrough was `1px` and that was the same mistake as the old time
rail** - a hairline is legible at arm's length and invisible from the door, on
a board where every other measurement is in cqmin. It is `0.26cqmin` now, so it
scales with the type it is striking. The "CANCELLED" chip also takes the
feature tier's size even on a queue row: every other chip here can afford to be
small, and this is the only one that changes what somebody does next.

**The chip is the exception, and that is the point.** Every row has a kind, so
chipping all of them would be a wall of chips carrying no information. Two
states are true of some rows only - a class that is **full** and a class that
is **off** - so those get the tinted pill and stay findable at a glance from a
few metres, which is the distance this board is actually read from.

**The seat count was a third chip and is gone.** "3 left", under five places
remaining, removed on 2026-09-22. It is a booking signal, and the people
reading this board are already in the building: "can I walk into this" is a
question somebody standing here has, and "how many places are left online" is
not. It also spent the row's one chip - the thing that only works while it is
rare - on the least useful of the three. `e.available` is still on the event;
nothing reads it.

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

**The countdown is no longer a function of status alone, and tick() had to
change to suit.** It used to be reconciled only inside
`if (li.dataset.status !== st)`, which was right while "next" and "live" were
the whole rule. With the 30-minute gate a `next` row 35 minutes out says
nothing and the same row five minutes later says "Starting soon", *with nothing
about its status having changed* - so left inside that branch it would have
appeared only when some other event happened to change state. `syncNote()` runs
on every tick now.

Verified rather than reasoned about, using the clock-stub technique below:
`Date` replaced with a shifted subclass at 15:10, one real tick observed
(`past` -> `next`, condensed, no countdown), the shift moved to 15:20, and one
more tick observed - "Starting soon · in 25m", the row expanded, **status still
`next`**. That last line is the whole test; with the old code it would have read
`next` and stayed condensed forever.

**`refresh()` and `tick()` are separate on purpose.** Refresh (5 min, network)
changes *what* is on. Tick (30s, no network) changes *where the day stands* -
past / live / next / later - which is what makes this a live view rather than a
list that reloads. Tick mutates in place rather than re-rendering: rebuilding
would throw away the progress bar's CSS transition twice a minute and fight any
text the viewer has selected. Verified by stubbing the clock 90 minutes forward
and waiting one real tick - the two live rows went past, their badges and
progress bars were removed, and the "checked" stamp did **not** change, which
is the proof no fetch was involved.

**A row with no studio is usually right, not a gap.** `studioOf()` resolves the
owning studio through `data/studios`, which the reel already used - studios.ts
imports no data, so the board gets the map for about a kilobyte rather than
the calendar. About a third of the calendar carries no studio slug, but over
half of that is genuinely whole-building: tours, new-member orientations, game
night, the space being closed. The temptation is a title-matching fallback
("Woodshop Guided Studio" -> woodshop, six titles' worth); it was deliberately
not built, because it makes the board look correct while the source stays wrong
and removes the pressure behind WISHLIST's studio-tag ask. The genuinely
untagged handful shows a blank instead.

Three events resolve to two studios (`leatherworking` + `sewing`, `cnc` +
`woodshop`). Both are shown. Which room it is actually in is a question for the
organiser, and choosing one silently would answer it wrongly some of the time.

**The dummy fixture carries the calendar's slugs, not ours.** The woodshop is
tagged `woodworking` on the real feed and studios.ts maps it back;
`events-dummy.json.ts` said `woodshop`, which resolves to nothing - so the
dummy board would have been missing a label the production board shows, which
is exactly the kind of divergence a fixture exists to prevent.

**Exactly one row is ever `next`.** "Starting soon" has to mean one thing on a
board, or it is a synonym for "not yet" repeated down the page. A cancelled class
cannot be the one - see below.

**A cancelled class is never running and is never what is next, and until
2026-09-22 it could be both.** A cancelled event still has a start and an end,
so the clock alone decided: on the calendar as it stands, the cancelled ceramics
class at 17:30 came out **`next` at 17:10** - a feature plate that grows a
"Starting soon" pill telling somebody to walk to a room - and **`live` at
18:00**, with "On now" and a progress bar running through a session nobody is
in. That is the board actively misdirecting the one person it exists to help.

`statuses()` takes an `off` predicate now. A cancelled event keeps its place in
the day - `past` once its slot has been and gone, `later` before that - because
somebody who turned up for it still has to find it. It just cannot be the thing
the board points at, and the `next` slot passes to the soonest class that is
actually happening. The predicate is passed in rather than detected in
day-status.ts, which deliberately knows nothing about an event beyond its two
times. `npm test` pins both hours, with a no-predicate call as the control.

It reads **"Starting soon"**; it read "Up next" until 2026-09-22. Both name the
same single row, but one describes a position in a list and the other describes
the thing somebody in the doorway wants to know - and a board is not a queue you
are waiting in. The rename is not free: 13 characters against "On now"'s 6, in a
time block whose width is one number for every tier.

**And because it says *soon*, it has to mean it.** The row that is next at nine
in the morning can be six hours away, and a line reading "starting soon" over
it is simply false. `startingSoon()` gates it at **30 minutes** - about the
point where the label stops being a fact and becomes an instruction, which is
to start walking to the room. Outside the window the row keeps its feature
plate and its picture and its "starts in 4h", which is the honest version of
the same information; it just says nothing at all.

The rule is in lib/day-status.ts with the rest of the time logic rather than in
the renderer, and `npm test` pins the boundary: 31 minutes out is not soon, 30
is, and the morning board's first class at an hour out is not.

**The fit pass has an escape hatch now, and real data is what found the hole.**

fit() may never hide a live row or the next one - those are the two facts the
board exists to show. So when *those alone* overflow, there was nothing left to
drop and the pass simply gave up, leaving `overflow: hidden` to cut the last
plate in half with nothing on the board admitting to it. A board that looks
like the day ends early is the exact failure this whole pass exists to prevent.

It was invisible against the fixture, which has one live row. Three classes
start at 6pm on **2026-10-07** - Industrial Sewing, Big CNC and the CNC series -
and three lit plates plus an "up next" came to 1637px in a 1543px list, with the
next class clipped and the board saying only "+ 1 later not shown".

**Dense mode** is the answer: rather than clip the tier, stop showing it. Every
row drops to the queue shape - one line each, but the plates keep their colour
and the countdowns keep their text, so what is running is still the one green block
on the board. It is the tier that goes, not the information. The drop pass then
runs again over the smaller rows. Verified at 1000x1050, where all five of that
day's events fit with nothing hidden and nothing clipped.

Its CSS is the queue geometry restated under `.t-list.is-dense`, which outranks
the `.t-row:is(...)` tier rules on specificity alone - no `!important`
anywhere.

**A dead branch in the same function, found while rewriting it.** The "if the
+N line itself tips the list over, give a row back" step read
`if (overflows()) { const r = …; if (!overflows()) r.hidden = false }` - an
inner condition that cannot be true inside its own negation. It never ran, so
the line could push the last row off the board unchecked. It hides one *more*
row now, in the same order drop() uses, and updates the count to match.

**The pill is gone, and its words went into the countdown.** It lived in the
tag row first, then in the time block, and was deleted on 2026-09-22. Both
moves were improvements and the deletion supersedes them:

- In the **tag row** it cost about 150px, which on the real calendar was the
  difference between `CERTIFICATION · CNC + WOODSHOP  4 LEFT` sitting on one
  line and wrapping - with the `·` separator, which lives in
  `.t-studio::before`, orphaned at the head of line two.
- In the **time block** it filled a block that is a plate tall and had one
  short line in the middle of it, and moving it there was enough on its own to
  make 2026-10-07 fit without dense mode.
- Deleting it fixed what neither move did: the pill said "On now" and the line
  under the description said "50m left", which is the same fact twice. It reads
  **"On now · 50m left"** and **"Starting in 20m"** now, and the time block is
  for the time.

Two things fell out of it. The lamp moved to `.t-note::before`, where it sits
in front of the words that replaced the pill. And the time block's grid
stopped being stretched by a spanning item, so measuring its columns finally
means what it looks like it means.

**The board is verified against the live calendar now, not only the fixture.**
`?now=HH:MM&on=YYYY-MM-DD` drives both the clock and the fetched day, so any
real date is a link. Worth using a genuinely busy one: the fixture is eight
tidy rows chosen by us, and what breaks a layout like this is a 54-character
title, a two-studio row, three simultaneous starts, and a day where three
events in five carry no picture at all. Every one of those is on 2026-10-07.

**Three tiers, and the tier is the whole design.** Every row carries the same
elements; how much of the board each gets is decided by two things.

- **full** - the class that is running. Big picture, the summary, the countdown
  sized to be read at the same distance as the title, a solid green time block
  and a green frame.
- **elevated** - a class inside its half hour. **Exactly the same geometry**,
  with a light green block and no frame.
- **condensed** - everything else, and the *base* case in the stylesheet
  because most of a day is one or the other. A title with a subtitle under it:
  the name of the thing, then the line that qualifies it. Finished rows are
  that same shape, greyed.

Until this, all eight rows were the same size, which made the board a list. The
two things somebody walking through the door needs were rendered identically to
a class that finished four hours ago.

**The tier used to be `data-status` alone, and that put a class six hours out
on half the board.** Every `next` row was elevated, whether it started in 20
minutes or at nine tonight - so the second-biggest thing on a Tuesday morning
was a class nobody could act on for most of the day.

The flag is `is-up`, and it is toggled in `syncNote()` because **the countdown
and the tier are the same question**: a row is elevated exactly when
`statusNote()` gives it something to say - it is running, or it is about to
start. One source of truth, set on first render and reconciled on every tick,
so the row grows at the same moment its line appears. Verified with the clock
stub: at 15:05 the
row is `next`, 179px, summary hidden; the shift moves to 15:20 and one tick
later it is `next` still, 272px, summary shown.

Four scales was tried on paper and is worse: it steps the left edge four times
down the page, and "later" and "past" want exactly the same room as each other.
`past` differs by colour, not by size.

**The two elevated tiers share one geometry, and they did not at first.**
Running had a 25cqmin picture and a 4cqmin title; about to run had 22 and 3.6.
That put the bodies of two plates of the same shape on left edges 32px apart,
which down a column reads as a mistake rather than as hierarchy - and it was
one. The account this tier is built from is that a class *expands* when it
comes up and then *stays expanded* and activates when it starts: size is the
first change, colour is the second, and making size do both jobs muddled them.
One `--shot`, one `--pad`, one title size; the frame, the solid block, the lamp
and the progress bar are what "running" adds. Checked by asserting the two
bodies share a left edge, not by looking.

**The condensed row is a title with a subtitle, not one line with the meta
pushed to the far edge.** The old arrangement read as two columns rather than
as one thing, and wrapped badly the moment a title ran long. Stacked, it is the
same shape as the tiers above it, just smaller - one row design at three sizes,
rather than three row designs.

`flex-basis: 100%` on the title is what breaks the line. The DOM order is tags,
title, note, because the elevated tiers want the meta above the title as an
eyebrow; the condensed body is a flex container with `order` reversing them and
a full-basis title forcing everything after it onto the next line.

**Finished rows are greyscaled, not just faded.** It is the one row on the
board where the colour carries no information at all - no room left to book, no
studio to walk to right now, nothing green about it - so the colour comes out
and the fade takes it the rest of the way. It also turns the photographs black
and white, which is the clearest "this has happened" a picture can say.

**`.t-row.is-bare` must sit below every tier rule, and this bit once.**
`.t-row.is-bare`, `.t-row.is-up` and `.t-row[data-status='live']` all weigh
(0,2,0), so source order alone decides which `--shot` wins. With the bare rule
above them, a tour running right now came out bare and still reserved 25cqmin -
270px of empty plate on the one row nobody can miss. Worth checking against the
live tier specifically, because it is the only one where the reserved slot is
big enough to look like a fault.

**It is CSS off `data-status`, not different markup, and that is load-bearing.**
tick() mutates rows in place every 30 seconds and never rebuilds them - that is
what keeps the progress bar's transition alive and what the whole file is built
around. Markup that differed by tier would force a re-render on every status
change. As it is, a class that goes live at 2:15 simply grows where it stands.

**Nothing on this board grows into the day's slack, and getting there took two
goes at the same wrong idea.**

The list is a flex column, and rows were `flex: 1 0 auto` with a per-tier
`max-height` so that a quiet day did not end in a screen of empty ground. That
was written when the board was white with hairline rows, where trailing space
read as an unfinished page.

It is wrong, and for one reason that applies to both tiers: **the things inside
a row are fixed sizes, so a taller row is not a bigger row - it is the same row
with more space around it.**

- On the **feature** tier it showed as dead white. 2026-09-27 has three classes
  running at once, and the three plates came out 508-559px tall holding 410px
  of content: about 150px of nothing each, with the green time block stretching
  through all of it.
- Moving the growth to the **condensed** tier just moved the symptom. A queue
  row grew to 216px around a picture that stays 119px square, so the inset
  became a band of padding above and below it.

So nothing grows now. Leftover space sits at the foot of the list, where mist
ground under a stack of plates reads as "that is all that is on" - which is
true, and is what a stack of cards does anyway. Measured after: feature rows
417/409, 366/358, 373/365 plate against content (the 8px is the border), and a
condensed row 153px holding a 119px picture - 17px around it, which is the
13px inset plus the border.

**`flex-shrink: 0` stays, and separately.** A row allowed to shrink would
silently squash its own content instead of overflowing the list, and fit()
detects "too many rows" by asking whether the list overflows - shrinkable rows
would let it crush eight events into the space for six and report that
everything fits.

**No growth also means no `max-height` anywhere**, which retires a real hazard:
these rows are `overflow: hidden`, so a cap that bites into content cuts it off
rather than compressing it. That happened once - removing the feature tier's
own cap left the base rule's in force over it and sliced three live plates off
mid-sentence.

**The condensed tier keeps one `min-height`**, equal to the picture plus twice
its inset, so a row with no picture is not visibly shorter than the ones around
it (145px against 153px). It cannot be written as that `calc()`, because
`.is-bare` zeroes both inputs and the floor would go with them.

Verified under pressure at 900x1000: three earlier and two later dropped, "+ 3
EARLIER · 2 LATER NOT SHOWN" printed, and the live and next rows owning the
board. Hiding rows cannot oscillate, because flex growth never exceeds the
space available.

**There is no rail any more, and the reason is distance.** It was a 2px line
down the left of the list, filled green from the top through the running row and
hairline below it - a continuous spine saying how much of today is spent. It
reads well at arm's length and is simply gone at five metres, which is the only
distance this board is ever read from. The same information is carried by the
time *blocks* now (below), which is the identical idea in a material that
survives the room.

A rail filled to a *percentage* was tried on paper before either and rejected:
the live row already carries a progress bar, and two readings of the same number
on one row is one too many.

**The board is mist and every event is a plate standing off it.** What
separates one event from the next is the *ground showing through between two
plates* - there are no hairlines on this board at all. A rule drawn across a
row is a table; a gap between two plates is a board, and that one change is
most of what stopped it looking like a printout.

**The colour lives in the time column, and nowhere else.** The plate behind the
words is white on every row; the block on its left is what says where the
event stands, so one column read top to bottom is the day:

| state | time block | the row |
| --- | --- | --- |
| upcoming | wash - light green, **dark green type** | condensed |
| starting soon | wash - the same light green | expands |
| on now | **solid green**, white type | stays expanded, gains a green frame |
| over | hairline grey | condensed again, whole row greyscaled |
| cancelled | alert red, struck through | until it is over - then grey like the rest |

**The type in the block is green, not ink.** Black on a tinted block is the
hardest thing in the column, and it was taking attention from the one block
that is actually filled - the running class. Dark green stays legible at five
metres and lets solid green be the loud one; the meridiem takes a step lighter
again, since nobody at this board is checking whether a class at 2:15 is in
the morning.

**A cancelled class stops being the exception once it is over.** Cancellation
is urgent while there is still something to turn up for; afterwards it is just
another thing that did not happen today. The alert block greyscales to a
mid-grey that was the darkest thing on an otherwise pale evening board - the
one row pulling the eye was the one with nothing left to say. Past wins over
cancelled now, and the struck title and the CANCELLED chip still say which one
it was. It needs the compound selector `.t-row[data-status='past'].is-off
.t-time`: the two single-condition rules weigh the same, so source order would
otherwise decide it.

The middle two steps sharing a colour is the point: expanding *is* the change
when a class comes up, and going solid is the change when it starts. Two
different signals for two different events, rather than one gradient nobody can
read the middle of.

**Tinting the plate instead was tried first.** `next` had a wash plate, which
put a green panel behind a title, a summary and a photograph to say "starts in
20 minutes" - a lot of green for a small claim, and it left the same words
sitting on two different grounds depending on the hour. It also meant chips and
icon tiles needed white backgrounds on that one row to stay visible, which is
the same "second palette for one row" problem the solid green live plate had.
All of those overrides are gone.

**The live frame is an overlay, not a border, and the difference showed on
every plate that is not framed.** A border has to be reserved on all of them or
the framed plate comes out narrower inside than its neighbours - so every row
carried `border: 0.4cqmin solid transparent`. `background-clip` is `border-box`,
so that band showed the plate's own white: a 4px ring around every time block
and every picture on the board, an outline round the two things that are meant
to run to the plate's edge.

An inset `box-shadow` is the usual answer and cannot be used here - the row is
`overflow: hidden` with children that paint their own backgrounds, so the time
block would cover the frame down the left-hand edge. A positioned `::after` is
painted above every child, costs no layout, and needs nothing reserved
anywhere. `.t-row` keeps `position: relative` for it.

**`live` was a solid green plate first, and a whole field of brand green was
too much of it.** The running class shouted over the rest of the board rather
than leading it, every photograph on it had to fight a green surround, and the
type, the chips, the icon tiles and the progress bar all had to be inverted to
survive on it - a second palette maintained for one row. It is a white plate in
a green frame now, and the solid green time block is what carries the colour.

Weight is what makes a frame work at this distance, not the colour. A 1px rule
is what the old time rail was, and that was legible at arm's length and gone at
five metres - so the frame is **0.4cqmin**, about 4px on a 1080 screen and twice
that on a 4K panel.

Every tier carries `border: 0.4cqmin solid transparent`, so the framed plate is
not narrower inside than the plates around it. `background-clip` is `border-box`
by default, so each plate's own colour fills the band and nothing shows until a
`border-color` is set. An inset `box-shadow` would have done this without
reserving space and cannot be used here: the row is `overflow: hidden` with
children that paint their own backgrounds, so the time block would cover the
frame down the left-hand edge.

The drop shadow stays green-cast, which is most of why a white plate still reads
as lifted rather than as another queue row.

**"Sunk" was the first version of `past` and it was wrong.** Finished rows had
no plate at all - transparent, so a finished class became the ground. It reads
well written down and badly on screen: with nothing under them the time block
and the title had nothing holding them together, and the grey block ended up the
heaviest thing on a row that is meant to be receding. A faded plate says the
same thing and stays an object.

Its time block then has to be the **hairline** token rather than mist. A faded
white plate comes out around `#F8F9F8` over the mist board, and a mist block on
it lands within a couple of units of the plate - so on the 10:30pm board, where
every row is past, every time looked like it had fallen off its plate onto the
ground. Found by looking at that hour specifically; at any hour with a live row
in it the board looks fine and the bug is invisible.

**The time is a block, and it is where the board got its spine back.** The times
were the structural idea and were set in the same face, weight and colour as the
titles beside them, which made the spine invisible. They now have their own
field of colour running the full height of every plate, with the hour big and
tabular over a small tracked meridiem - `clockParts()` in lib/day-status.ts
splits them, and `clock()` is built from it so the hero clock and the rail
cannot drift. `npm test` pins the three hours that are not simply `h % 12`.

The meridiem is small on purpose: nobody standing in front of a board checks
whether a class at 2:15 is in the morning, and setting both halves the same size
spends the column's whole presence on the half that is never read.

One block width for every tier, so the column is a column; the hour size steps
with the tier. The hour is much bigger on a feature row - a block that is a
plate tall with a queue-sized hour in the middle of it reads as a caption
floating in a void.

**The block is a grid, and that is what keeps the time on one line.** It was a
wrapping flex row, and on the feature tier the meridiem dropped under the hour
whenever the pair came close to the block's width - so the time read as two
lines on exactly the plates where it is biggest. As a grid with two `auto`
columns the hour and its meridiem share a row *by construction*; the badge
spans `1 / -1`, so it is the one item allowed to start a new one. The narrow
layout, where the block is a header bar across the top of the plate, switches
to `grid-auto-flow: column` and the badge gives up its span to sit inline.

**The time is centred as ink, and the departure-board alternative was tried
and reversed.** Padding the hour out to the width of the longest time and
right-aligning it (`min-width: 4.7ch`) lines the meridiems up exactly and hangs
the numerals off a shared colon, which is what a departure board does. It also
puts a short time visibly right of the middle of its own block, because the
empty half-digit is then *inside* the box rather than outside it. On a board
where every row is its own plate, a time that is not centred in its block is
what you notice; column alignment is worth less here than it would be in a
continuous table, because these are cards, not rows of a table.

**The feature hour is 3.9cqmin, and the number is measured.** The block's inner
width is 13.6cqmin. The widest time the calendar can produce is a two-digit
hour - "10:00", "11:30" and "12:00" are all exactly the same width, because the
face is tabular - and at 4cqmin that pair came to 157.5px of ink in 163.1px of
room. Five pixels is not a margin on a thing that clips silently, so it backs
off to about nine. Everything here is in cqmin, so that ratio holds at every
board size.

`--rail` went 16 -> 17.5cqmin for the same reason: at 16 the worst-case time
needed about 158px of a 147px block. Measuring the *grid columns* is
misleading, incidentally - the spanning badge stretches them, so "STARTING
SOON" makes them look full when the time has room. Measure the text with a
Range.

**The footer strip is ink, and that is what closes the composition.** Green band
at the top, light body, dark strip at the foot. It was mist, which on a mist
board is nothing at all - the schedule simply stopped and two grey sentences sat
under it. Dark also does the job a footer has to do here, which is to be plainly
*not* another row of the schedule. Sage on ink for the phone number is the live
site's own pairing - that is what seattlemakers.org sets on its dark bar - so
`--color-sm-sage` is in the tokens now rather than only in the table above. It
must never go on white: 2.78:1, which is why `--color-sm-on-green` exists.

**The narrow layout's time block spans `1 / -1`, and the bug it fixes looks like
a rendering fault.** Left in column 1 it stopped where the picture's column
began, so a tinted bar ran two thirds of the way across each plate and gave up.
There is no rail at this width and nothing else in that column to line up with,
so the block takes the full plate width and becomes a proper header bar, with
the words and the picture placed underneath it. It also has to go back to
`flex-direction: row` *and* restate its gap - the feature tier's stacked
`gap: 0.2cqmin` is the space between two lines there and the space between two
words here, so without it the plate reads "2:15PM".

**Finished rows kept their picture again on 2026-09-22, and the note that said
otherwise was about a different board.** They dropped it when a past row was
flat white at 42% opacity, where a pale rectangle with a ghost in it read as an
image that had failed to load - checked on the 10:30pm board, where every row is
past and eight faded tiles read as eight faults. With plates, a faded picture
sits on a faded plate with a radius and an inset, and reads as muted rather than
broken; checked at the same hour. Keeping it also means "shows a picture" and
"has a picture" are the same question, which is what lets `.t-row.is-bare` be
decided once at render rather than changing when a row crosses over.

**The picture is wrapped now, and the wrapper is not decoration.** An `<img>`
cannot clip its own transform, so the live row's pan would bleed the photograph
over the words beside it. `.t-shot` owns the square, the radius and the
`overflow: hidden`; `.t-thumb` fills it and is the only thing that moves. The
error fallback removes the *wrapper*, not the image - left behind, it is a
tinted square with nothing in it, which reads as a picture that failed rather
than as a row that never had one.

**The queue's right-hand cluster is right-justified on every line, not just the
first.** With a long title the meta wraps, and left to itself that second line
packs to the left - which strands a note on the right of line one above a
left-aligned row of labels, reading as two different rows. `justify-content:
flex-end` on the row body fixes it; the `margin-right: auto` on the title still
wins on line one, because auto margins take the free space before
justify-content sees it.

**Only the two rows somebody can act on get a note at all.** A finished class
said "finished" until 2026-09-22, which was a fourth way of saying the same
thing - the plate has already faded, the time on it has already gone by, and it
is sitting above the row that is running. It was also the note that kept
triggering the wrap above, so on any past row with a long title the word ended
up stranded on a line of its own: the most conspicuous thing about the event
nobody needs to look at. `statusNote()` returns `''` for `past` now, the same
as it always has for `later`, and `npm test` pins both.

**The clock earns its place rather than decorating.** Every time note on this
board is relative - "starts in 45m", "1h 15m left" - and a relative time with
nothing absolute beside it cannot be checked from across a room. It is also the
one thing here that is true by the minute, which is what stops a screen left up
for days from reading as a printed poster.

It runs off `now()`, not `new Date()`, so a board under `?now=` shows the hour
it is pretending to be. Showing the real time beside a simulated schedule is the
one thing a clock here could get badly wrong: the red bar says the day is made
up, and a truthful clock would quietly argue with it.

Its own 1-second interval, not a passenger on tick(). At 30s it would sit on the
wrong minute for up to half of every one of them, which is visible next to any
other clock in the building. `paintClock()` writes only when the text changed,
so the other 29 calls a minute cost a string compare - the alternative dirties
the same node 86,400 times a day on a screen nobody ever reloads.

**What moves, and what deliberately does not.** Three things, and the restraint
is the point - ambient motion spread across a board reads as a screensaver.

1. A **status lamp** on the "On now" countdown, 2.4s. It is the vernacular of
   every machine in the building: the thing that is running has a light on it.
   It sits on the one row that is genuinely happening. It was on the pill in
   the time block until that went; it moved to the words that replaced it,
   which is the same place on the plate for the same reason.
2. A **26-second pan** across the running class's own photograph. Slow enough
   that somebody standing at the board does not see it move and somebody
   walking past sees that this is not a poster. 2D transform only - the reel
   carries the same note, and for the same reason: `translate3d` promotes the
   image to its own compositor layer, which some capture and remote-display
   paths render as solid black, and a wall board is exactly the kind of screen
   that gets mirrored.
3. The **progress bar** and the **clock**, which were already the board's only
   honest movement.

A sheen on the progress fill and a staggered entrance were both built and cut.
The entrance one is worth recording as a trap rather than a taste: `render()`
replaces the whole list every five minutes, so any entrance animation fires
every five minutes forever on a screen in the space.

Reduced motion is honoured here specifically, and not only by global.css's
blanket reset. That reset sets `animation-duration: 0.01ms !important`, which
does not stop an animation so much as fast-forward it - the pan would finish
instantly and leave the photograph parked at its end keyframe, permanently
zoomed and offset. Setting `animation: none` on the two rules wins on
`animation-name`, which is not what the reset touches.

**The fit is what makes a wall screen possible, and what it gives up is
ordered.** A TV cannot be scrolled, so anything past the bottom edge is
invisible with no way to reveal it - worse than absent, because the board
silently looks like the day ends early. `fit()` hides rows until the list fits:
finished events first (oldest first), then the far end of the day (latest
first), and **never the live row or the next one** - those are the two facts
the board exists to show. Rows are hidden rather than removed, so the next pass
can bring them back without a re-render.

**The board is one element at two sizes, and that is the whole design.**
`#t-board` holds the greeting, the date and the rows; the page around it holds
the tool's title, the crumb, the stamp and the button. On the page the board is
a miniature; in fullscreen the page is hidden and the same element fills the
screen. No copy is written twice and nothing in it changes between the two - an
earlier attempt swapped the heading between "Daily Events" and "Welcome to
Seattle Makers" depending on the mode, which meant the page could never show you
what the wall would say.

**The hero says the name in words, and the lockup moved to the foot.** This
reversed on 2026-09-22 and the reversal is worth keeping, because the old note
here argued the opposite and was right at the time.

It used to read "Welcome" - one word - with the wordmark knocked out white
beside it. The argument was that the mark already said the name, so a greeting
that said it too made the board repeat itself and wrapped the line to leave room
for its own repetition. That was a true observation about a hero *containing the
mark*, not a general rule, and it stopped applying the moment the mark went to
the footer. The greeting is now the only place the name appears, so it says it
properly: **"Welcome to Seattle Makers!"**, with **"Please check in at the
kiosk"** under it.

**"Please check in at the kiosk" is gone too, as of 2026-09-22, and with it the
board's only instruction.** It was the help strip's first line before it was
the greeting's second, and it was removed from the strip when it moved here -
so nothing on the board now tells somebody who has just walked in what to do.
That is the deliberate consequence of cutting it and not a leftover: if the
instruction should come back, the footer strip beside the phone number is
where it lived and where it fits.

The greeting is the only thing on this side of the band now. The date and the
clock are reference and sit on the other.

At 6cqmin the longer greeting wrapped (26 characters against "Welcome"'s 7,
in whatever the date column leaves), so it is **5cqmin**. A greeting that breaks
itself is smaller at five metres, not bigger.

**The date moved up beside the clock.** It used to sit under the greeting as
"What's on today · Tuesday, September 22", which left the left side carrying a
greeting, an instruction *and* a fact while the clock stood alone on the right.
Grouping the two clock-like things is what lets the greeting be a greeting. The
`<span id="t-date">` went with it - the date is now that element's whole
content, and today.ts still rewrites it by id at the day rollover.

**The lockup is the one-line "Skinny" variant wherever it sits.** At a
corner-sized footprint the stacked lockup puts SEATTLE on its own line at about
13px and it goes soft, where one line buys roughly double the letter height in
the same space. Reversing it costs no second asset: the artwork is black on
transparent, so `filter: brightness(0) invert(1)` knocks it out white - now
against the ink strip rather than the green band, held at 80% so it does not
out-shout the phone number standing next to it.

In the footer it gets *smaller* on a narrow board rather than bigger, which is
the opposite of what it did in the hero. There it was the only thing saying
where you were and wanted every pixel; here it is a sign-off beside the one
number somebody has to read off a wall and key into a phone.

**Everything inside the board is measured in `cqmin`, and a single `rem` in
there breaks the preview.** The board is `container-type: size`, so `cqmin` is
1% of its own short side and the whole thing scales as one drawing. A page unit
inside would stay put while the board shrank, the miniature would fit a
different number of rows than the screen does, and the preview would quietly
stop being one. Proof that it holds: at 1440x900 the wall board drops 4 rows and
prints "+ 4 earlier not shown", and the miniature of it on the page drops the
same 4.

The short side rather than the height, because the board is previewed in
landscape and hung in portrait and type sized off the long axis is enormous on
the other one - the same rule the label geometry follows.

**The miniature takes its shape from `screen`, not from a guess.** today.ts
writes the monitor's aspect ratio into `--board-ar` (and `--board-arn`, because
the width cap has to multiply a height by a number). A hardcoded 16/9 would be a
preview of a screen nobody here owns - hang the real thing on a portrait TV and
the row count, the wrap points and the fit pass all differ from what the window
promised. The cost is that on a phone the preview is phone-shaped, since that is
what fullscreen there would fill.

**`fit()` runs at both sizes now.** It used to return early unless the display
layout was on, which was right when the page was a scrolling list and is wrong
now that the page is a picture of a screen. A `ResizeObserver` on the board
drives it, because the board changes size for reasons the window knows nothing
about - entering element fullscreen, an `--board-ar` rewrite, the page reflowing
around it.

**An empty list must stop claiming the height.** `flex: 1 1 auto` on a list with
no rows pushed "Nothing on the calendar today" to the very bottom of the board
under a white void, which reads as a board that failed to draw rather than as a
quiet day. `.t-list:empty { flex: 0 0 auto }` plus `auto` block margins on
`.t-empty` centres it. `replaceChildren()` leaves the list genuinely childless,
so `:empty` is a safe test.

**The rail's breakpoint is a container query, not a media query.** What decides
whether there is room for a time rail is the board's own width, and the board
can be 263px wide inside a 1440px window. Asking the page would collapse the
rail on a phone while leaving it on a miniature of the same size.

**There are two routes into fullscreen and they are different mechanisms.**
The button calls `requestFullscreen()` on the board element, so the browser
renders that element and nothing else - the page is not hidden, it is not drawn,
and no stray chrome can survive on a screen in the space. F11 leaves the whole
page rendered, so the `html.t-tv` rules hide the chrome and let the board take
the viewport. Both end at the same picture, and they share one declaration block
(`#t-board:fullscreen, html.t-tv .t-board`).

**Fullscreen itself has two detections, and they do not see each other.**
`document.fullscreenElement` is set only when a page called
`requestFullscreen()`; pressing **F11** puts the *browser* in fullscreen and
leaves it null. The CSS `(display-mode: fullscreen)` media query is what catches
F11. `isFullscreen()` checks both, and both are listened to: `fullscreenchange`
for the API, the MediaQueryList's `change` for F11. Resize usually fires as well,
but not dependably - going fullscreen on a screen the window already filled
changes no dimension. The MediaQueryList is created once at module scope,
because one built inside the check would stop firing as soon as it went out of
scope.

**Fullscreen is allowed to skip the display-mode thresholds.** Those exist to
stop a *size* being mistaken for an intent, and F11 is not a size. `?tv=0` still
wins, so a fullscreen window can be held in the windowed layout while someone
works on it. `t-full` is set alongside `t-tv` and no rule uses it today; it is
kept because it is the only thing that says *which route* a board on a wall took,
which is the first question when one of them is stuck.

**The element-fullscreen button cannot be verified from the preview pane.**
`requestFullscreen()` there fails with `TypeError: Permissions check failed` -
the pane's frame is not permitted - so the button needs one click in a real
browser tab. The styling it lands on is verified, because `?tv=1` exercises the
same declarations.

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

**The help strip is part of the board, not of the page.** Someone standing in
front of this screen has questions the schedule cannot answer, so the answers
belong on the wall rather than on a web page nobody in the building is looking
at. It is static markup in today.astro, because today.ts only ever replaces the
rows.

It used to carry two: "New here? Sign in at the check-in PC when you arrive."
and the phone number. The first moved into the hero as the greeting's own
second line, because an instruction about arriving belongs next to the welcome
rather than in the small print at the foot - and once the hero said "Please
check in at the kiosk", keeping it down here was the same instruction twice, in
two different words, on one board. What is left is the question the schedule
genuinely cannot answer: how to find a person. (If the kiosk and the check-in
PC are *different* objects, this deletion lost something and the strip needs
its line back.)

**The strip is `flex-wrap: nowrap`, and that is a fix rather than a
preference.** With the lockup in it, the sentence sizes to its own content -
755px - and with the 227px mark and the gap that came to 1036 in a 1007 strip,
so the pair wrapped and the lockup dropped onto a line of its own at the left.
A wrapping *container* puts the whole item on the next line; a non-wrapping one
lets the sentence shrink and break internally, which is what should give way.
`.t-help-item` needs `min-width: 0` for that, since a flex item's default
minimum is its own content.

It is `flex: 0 0 auto` above a list that is `1 1 auto`, so it takes its height
first and `fit()` drops rows to suit. That order is deliberate: a dropped row
is still counted in "+ N later not shown", while "call this number" has no
smaller version of itself. It also survives the empty board, which is when it
earns its place - a screen reading "Nothing on the calendar today" and nothing
else tells someone who just walked in exactly nothing.

**The phone number is copied from seattlemakers.org and has to follow it.**
`(206) 659-1726`, published identically on the home, about and contact pages
(and as `tel:+12066591726`), checked rather than remembered. A stale number on
a wall is worse than no number, because it gets dialled before anyone thinks to
doubt it. It is plain text rather than a `tel:` link: the screen it is written
for has no pointer, and a person with a phone is keying it in from across the
room anyway.

### Descriptions

**`og:description` is the only usable source, and that was measured rather than
assumed.** Across a sample of event pages: `og:description` present on 8 of 8;
`<meta name="description">` 0 of 8; JSON-LD `Event.description` 0 of 8; the
`.tribe-events-single-event-description` body 0 of 8. There is no second option
to weigh.

**What it hands back needs work, in four specific ways** - all of them live on
seattlemakers.org right now, all handled in `lib/summarise.mjs`:

1. A trailing `[…]` where WordPress cut the excerpt.
2. A heading glued to the paragraph after it with no punctuation between:
   *"…required prior to using the woodshop Working on a project…"*
3. A bullet list flattened into word salad, announced by an emoji:
   *"…atmosphere! What's covered 🌞 Printing films & burning screens Films…"*
4. A missing space after a full stop: *"coverstitch machine.In this course"*

The rule that ties it together: **complete sentences only, up to a budget.**
Half a sentence with an ellipsis reads as broken; a whole short one reads as
written. On the sample this turned 7 of 8 clean immediately, and the eighth -
the glued heading - needed the narrow `OPENERS` rule.

**`OPENERS` is a word list, and it is deliberately narrow.** A general
"lowercase followed by a capital" rule also matches *"the Seattle Makers maker
space"* and would eat half the sentence. It only ever runs before the first
sentence ending, so it cannot chop out a later clause. Verified against the
sample: it rewrote exactly the one entry that needed it and left the other
seven byte-identical.

**Descriptions cost a subrequest each, so the board asks for one day.**
`/api/events?day=YYYY-MM-DD` fetches event pages only for that day - 3 to 6 of
them, in parallel, capped at `MAX_DESCRIBED` so a malformed `day` cannot fan
out to a hundred fetches behind one request. Without `day` the response comes
back bare, which is what a caller wanting the whole calendar should get.

### Pictures

**`og:image` is the only picture an event page states about itself, and about
half of them have none.** Measured across 34 distinct events on the live
calendar: 20 carried one. So a row without a picture is the normal case rather
than a fault, and the layout has to be built around that.

**The fallback chain is photo, then the studio's icon, then nothing** - which
is the reel's chain, for the reel's reason: a generic studio photo in this
frame reads as a picture *of the class*, which it is not, while an icon reads
as a label. `studiosForCategories` is already imported here for the studio
name, so the icon costs nothing. The panel is tinted and the icon is
`contain`-ed and padded, because these are badges drawn to sit on a ground
rather than photographs to fill a frame - and because a panel the eye reads as
a symbol is not one it reads as a picture of the room.

**The tint went `--color-sm-wash` -> `--color-sm-mist` on 2026-09-22, and the
old reasoning was right about a different object.** Wash was chosen when this
was a small inset tile that needed a tint strong enough to register at all
against white paper - mist would not have drawn it. It is a full-height panel
now, where mist registers perfectly well and the same wash reads as a block of
colour: it was pulling the eye toward exactly the rows that have *no*
photograph. Green on this board means "on now". On the `next` plate, which is
itself wash, the panel takes paper so it does not disappear into its own
ground.

**The last tier is a plain calendar**, at `/brand/icons/event.svg`, drawn to
the same convention as the studio icons - dark line art in a white disc.
Whole-building events - tours, orientations, meetups, game night, 51 of 166 on
the calendar - belong to no studio and reach neither tier above it.

It used to be *nothing*, and that was right about the alternative it was
weighed against: the **wordmark**, which on a Seattle Makers board says
something true of every row and therefore nothing about this one. A calendar
glyph is a different claim - "an event, in no particular room" - which is
exactly what these rows are. It also keeps every plate the same shape, which
the empty slot did not.

An event in two studios takes the first; the pair it happens to is
leatherworking + sewing, and one icon beside both names is not a claim about
which room it is in, where two tiles would be.

**The picture is square, and inset by one small margin on every tier.** Two
things were wrong with it and they needed opposite fixes, which is worth
recording because the middle step looked like the answer.

It was *floating*: the only element on the plate with a wide margin round it,
next to a time block running edge to edge, so it read as a sticker on the card
rather than part of it - and on a queue row it was a 92px thumbnail adrift in a
100px-tall plate. Stretching it to the plate's full height fixed exactly that.
The card became three flush panels - when, what it looks like, what it is - and
it was a real improvement on what came before.

It also broke the square. A picture whose height comes from the row is a
different shape on every row: portrait beside a three-line title, letterbox
beside one line. `min-height: var(--shot)` held the floor at square but not the
ceiling, so the running class's panel came out 270x359. A square crop is what
these want to be, and it is what makes a column of them scan as one thing.

So: square again, with the inset cut to about half what it was - **and made one
number, `--shot-gap`, rather than the tier's `--pad`**. That was the other
half of "floating": tied to the tier, the inset was 35px on the running class
and 16px on a queue row, so it read as a different decision on every plate.
Enough margin now to keep the picture off the time block and the plate's edges,
not enough to leave it adrift.

The cost is vertical: a square picture takes more room on a short row than a
stretched one, and the 2026-10-07 board went back to "+ 1 later not shown". The
fit pass reports it, which is the deal.

**The picture leads the row, and its column is reserved.** Both of those were
arrived at by looking rather than by argument:

- *On the right* was the first version, and it is the one that needs no
  reserved column - a row with no picture simply gives the width to the words,
  and every title still starts on the same vertical.
- *Leading, with an `auto` column* is what "put the picture first" means
  literally, and it makes the board's left edge ragged: titles start on two
  different verticals, jumping by the width of a picture from row to row. On a
  thing read from across a room that straight edge is most of what makes the
  list scannable.
- *Leading, with the column reserved* keeps the edge and costs a blank indent
  on the rows with no picture. At the 20cqmin the picture was when it sat on
  the right, that indent is a void; small enough, it reads as a margin. So the
  picture is smaller than it would be on the right - that is the trade, and it
  is the reason for the size.

The sizes are now per tier - 11cqmin on a queue row, 22 on the next class, 25
on the running one - which steps that left edge exactly twice down the board.
That is a different thing from the ragged version above: every queue row starts
on one vertical and the two feature rows on another, so it reads as two blocks
rather than as noise.

**A row with nothing to show used to give the width back, and does not any
more.** For a while `row()` marked those rows `is-bare` and the CSS zeroed
`--shot` and `--shot-gap`, so the words started straight after the time block -
the alternative being 130px of blank paper, which reads as a picture that
failed rather than as alignment. It cost two left edges down the board.

The generic calendar icon retired it on 2026-09-22: with a last tier that
always renders, no row can be bare. Worth keeping the note for the specificity
trap it turned up, which applies to anything else keyed off a class here:
`.t-row.is-bare`, `.t-row.is-up` and `.t-row[data-status='live']` all weigh
(0,2,0), so source order alone decided which `--shot` won - and with the bare
rule above them, a tour running right now came out bare and still reserved
25cqmin of empty plate.

**The narrow layout keeps the picture on the right, and that is not an
inconsistency.** Below the board's 480px container query there is no time rail
and the row stacks, so a leading picture indents the *time* as well - with half
the rows unindented, it reads as two different row shapes rather than as one
list.

Three things about it changed with the tiers, and one was a latent bug. The
picture size reads `--shot` there now instead of a flat 22cqmin, which had been
giving a one-line queue row a picture twice the height of its own text. The row
gap was `0.4rem` - a *page* unit inside a size container, which is the one rule
the whole board rests on - and is cqmin now. And stacked rows need
`align-content: center` to grow: the grid is two rows deep there, auto rows
stretch by default, so a grown row opened a band of white between a time and
its own title. Centring the grid puts the slack outside the pair, where it
reads as the row's own padding.

**An item that names only a grid column is auto-placed into a new grid *row*.**
The picture is `grid-column: 2` with the body at 3; with the body already
occupying row 1, the placement cursor has passed column 2, so the picture went
to row 2 - under the words, doubling the height of every row carrying one and
pushing two rows off the bottom of the board. `grid-row: 1` fixes it, and the
element is appended between the time and the body so the DOM order matches what
is on screen.

**A thumbnail costs nothing beyond what the description already cost.** Both
come out of the same HTML, so `calendar-api.mjs` fetches each event page once
and hands it to `summarise.mjs` and `event-image.mjs`. That is also why
`describeEvent()` is gone from summarise.mjs: two fetchers meant two requests
for one page.

**What og:image hands back is often not a photograph, and size cannot tell.**
Three kinds of thing turn up, all of them live right now:

1. Real class photos and promotional artwork, 564-1220px.
2. Studio badges: `laser_logo.jpg` and `woodshop_saw_logo.jpg`, both 300x300.
3. Full-size flat artwork: `tour_icon.jpg` at 768x768,
   `Website-black-icons-20.png` at 1219x1220, and Yoast's emoji fallback
   `1f600.svg`.

(2) is caught by `MIN_IMAGE_WIDTH`, the svg by the extension test, and (3) only
by compression density - the reel's `MIN_BYTES_PER_PIXEL = 0.06`, measured on
the same calendar: those two icons land at 0.018 and 0.028 against 0.080-0.492
for every photograph. It costs one visible false negative, `screenprinting.jpg`
at 0.054, which is a real photo of a flat evenly-lit print.

**The density test weighs the original and the board is served a variant.** A
HEAD on the og:image gives bytes, and the page states that file's dimensions
exactly; the row then gets the smallest srcset variant at or above 640px -
768px in practice, against a 1220px original. Weighing the variant instead
would compare a downscale against a threshold calibrated on originals, and a
downscaled photograph carries *more* detail per pixel than the file it came
from. On today's calendar the variants are 250K of pictures rather than 700K.

**An image that cannot be weighed is kept.** Losing every thumbnail on the
board because a CDN stopped sending `content-length` is a worse failure than
the occasional icon sheet getting through, and by that point the width test has
already removed the badges. A *missing stated width* is the opposite case and
rejects the image: every page carrying an og:image carries the width beside it,
so its absence means the markup moved, and there is then no way to tell a badge
from a photo without downloading it.

**A thumbnail that fails to load falls down the same chain**, to the studio
icon and then to nothing. It is the one element on the board whose source is a
third-party URL that can 404 long after the row was drawn, and this board is
read from across a room and left up for days - a grey box with a torn-page icon
is worse than no picture. A flag stops a failing icon from retrying forever.

**The images are eager, and `loading="lazy"` is a trap here.** It looks like a
free saving, because `fit()` hides rows rather than removing them and a lazy
image in a hidden row is never fetched - but it hands the decision to the
browser's idea of "near the viewport", and this board lives in the contexts
that idea gets wrong: element fullscreen, a backgrounded tab, an embedded
frame. Left lazy it loaded *nothing at all* in a preview pane - every tile
blank, no error, no way to tell why from looking at it - which found the bug
that would otherwise have been found on the wall. A dozen 40K thumbnails that
all fit on one screen are not worth that risk.

**The URL is checked before it goes in an `src`.** Same-origin paths (the dummy
fixture) or `https://seattlemakers.org/wp-content/uploads/`, nothing else. The
feed is scraped from a page we do not control, so a URL out of it is untrusted
text exactly as the titles are - the same reasoning as `?src=` accepting only
same-origin paths. Checked in `event-image.mjs` and again in `today.ts`.

**`scripts/test-event-image.mjs` carries real byte counts.** Every fixture in
it is a real page's og:image and every `content-length` was measured against
the live site, so the file doubles as the record of what those measurements
were. No network: `fetch` is stubbed.

### The studio icons

**They are vectors now, extracted from the brand's own Illustrator master.**
All twelve live at `public/brand/icons/<slug>.svg` and total 123KB; they
replaced eight PNGs at 130-230KB *each* plus three crude SVGs drawn here to
fill gaps. They also stop being resolution-bound, which matters on a board
whose picture column is 270px on a 1080p screen and twice that on a 4K panel.

**A modern `.ai` file is a PDF**, as long as "Create PDF Compatible File" was
ticked on save - which is the default. `pdfinfo` says so immediately, and
`pdftocairo -svg` then gets at the artwork as paths rather than pixels. The
master has four pages: **page 1 is the colour set** (plus a palette bar), page
2 the mono set.

**`pdftocairo` ignores `-x/-y/-W/-H` for SVG output**, so the page cannot be
cropped on the way out - it emits all 792x612pt every time. The split was done
afterwards, on geometry:

1. `pdftoppm -gray -r 72` gives a PGM, which is a header and raw bytes - no
   image library needed, and none is installed. At 72dpi one pixel is one PDF
   point, so everything measured there maps straight onto the SVG.
2. Flood-fill the dark pixels into connected components. The twelve icon rings
   come out as the only components that are 77x77 and near-square.
3. Split the page SVG by path bounding box. Poppler emits only `M/L/C/Z`, so
   "every number is alternately x then y" is a safe way to get a bbox, and no
   path outside `<defs>` carries a `clip-path`, so they can be regrouped freely.

**The filter has to be the distance to the ring, not the bounding box.** A
square around each circle also catches bits of the curved labels that sit just
outside it - "Electronics" contributed a stray crescent 42.3pt from a centre
with a 38.5pt radius, and it rendered as a blot on the plate. Keeping only
paths whose nearest bbox point is inside the disc removes it and costs nothing
else.

**The assignments were checked by colour, not by reading the layout.** Each
icon has a distinct hue on the colour page - red laser, purple sewing, teal
screen printing, blue a/v, lime arts, pink ceramics, green electronics, orange
3d, gold cnc, crimson lapidary, yellow woodshop, and metalworking the one with
no saturated pixels at all. Averaging the saturated pixels in each ring
confirms which is which without trusting a squint at a thumbnail.

**Two studios came off the sheet that were not in `studios.ts`: arts & crafts
and lapidary.** `crafts` is a real calendar tag with 11 events, and
`/events/types/crafts/` comes back titled "Crafts Archives - Seattle Makers" -
against the bare "Seattle Makers" that a soft-404 gives, which is the tell
documented under *The poster*. So arts & crafts resolves and prints. Lapidary
has no tag at all and behaves like metalworking and a/v studio: the select
labels it "not tagged on the calendar yet", the sheet says so, and the QR falls
back to the whole calendar rather than a dead archive.

**The sheet has no leatherworking, so it borrows sewing's icon.** A placeholder
and marked as one in `studios.ts`: the two already share a calendar tag
(`leatherworking-sewing`), which makes it the least wrong thing to point at,
but a row tagged only `leatherworking` currently shows a spool of thread.

### The poster

**The sheet is a flex column inside a margin, not absolute positioning from the
page corner.** /labels has to hit a die-cut, so every label is placed in
absolute inches; this has nothing to hit, and paying that cost would buy a
second set of measurements to keep in step. The column is header / weekday strip
/ grid / footer, the grid is `flex: 1 1 auto` with `grid-template-rows:
repeat(var(--weeks), 1fr)`, and everything else is `flex: 0 0 auto`.

That one decision is what makes five weeks and six free. Measured rather than
assumed: at both, the grid is 5.339in tall - *identical* - with the rows going
1.068in -> 0.890in. The page cannot grow, because the grid has nowhere to grow
into. The footer's bottom sits exactly `--sheet-pad` above the paper edge
either way. It also made dropping portrait a deletion rather than a rework.

**The green panel prints with "Background graphics" switched off, and that was
checked rather than hoped.** `#page` sets `print-color-adjust: exact` and the
verification prints with `printBackground: false` - Chrome's default, and the
state a volunteer's print dialog is in before they touch anything. The header is
white type on green, so losing the green loses the words; this is the one place
on the site where a dropped background is not cosmetic. The UI hint says to
switch Background graphics on only *if the panel comes out blank*, because
demanding a step that is not needed is its own kind of wrong.

**The sheet is landscape, and that is not a setting.** Both were offered at
first and portrait was the default. Landscape renders better for a reason that
is arithmetic rather than taste: a cell is 10.24in / 7 = 1.46in wide against
portrait's 1.1in, which at 7pt is about 28 characters a line against 20, and
the calendar's median title is 27 characters. The same sheet that wrapped onto
two lines in every cell sits on one line landscape. Keeping the worse one as an
option was keeping a way to make a worse sign.

Removing it took `SHEETS`, the `Orient` type, `syncOrient()`, the `?paper=`
parameter and `setPageRule()` with it. That last one is the nice part: `@page`
size can read neither a custom property nor a class - page context is not
element context - so while there were two orientations the whole rule had to be
rewritten from script on every render. With one it is a static rule in the
stylesheet, and so is the rest of the sheet's geometry, which now lives on
`#page` rather than being pushed in as inline styles. Script sets only
`--weeks`.

**The date numerals are 11pt, not the 9.5pt the portrait sheet used.** This is
read standing in front of a door rather than held in the hand, and the date is
what the eye scans for. Measured before and after: it costs exactly one more
trimmed session on the whole-space sheet (27 -> 28 hidden, still balanced) and
nothing at all on any studio's own sheet, which is the sheet this tool is for.
The *title* size was deliberately left alone - raising it to 8pt would take the
line back under 27 characters and undo the one thing landscape bought.

**The header is 1.9in of an 8.5in page, and the QR is why.** `encode()` bakes a
4-module quiet zone inside the image, so a 37-module box is only 29 modules of
ink - the code reads as about an inch inside a 1.2in box. Shrinking the box to
what the ink looks like would put it under the 0.8mm warn threshold in
print-qr.ts. The alternative was /labels' `--quiet-pull`
trick, dragging the box out by the quiet zone; here the card is white and
already supplies the quiet zone, so paying the 0.25in outright is simpler than
a negative margin capped against the padding. Verified end to end: 0.858mm per
module, and `BarcodeDetector` reads
`https://seattlemakers.org/events` back off both a 150dpi and a 300dpi raster.

**The QR goes to the studio's own events**, at
`/events/types/<slug>/` - a real taxonomy archive. Verified per slug by
parsing the response and counting rather than by loading it and nodding:
laser-cutting 13, ceramics 18, sewing 27, print-making 20, woodworking 9, the
same numbers those categories have in the full calendar.

**It soft-404s, and that is the thing to remember.** An unknown term returns
HTTP 200 with a 176,553-byte page titled just "Seattle Makers" and no events on
it - identical for `/types/nonsense-slug/`, `/types/metalworking/` and
`/types/av-studio/`. A 200 is not evidence a link works, which is why every
slug here was checked by counting events rather than by status code.

The trap is avoided by construction rather than by sniffing responses: the slug
comes from the studio's own `eventCategories`, so a studio with no tag has no
slug and falls back to the whole calendar. The two studios that would soft-404
are exactly the two with an empty `eventCategories`.

**cnc is pinned to `cnc-routing`, and that is the only entry in
`ARCHIVE_SLUG`.** Its events are split over two archives and neither shows
both - `/types/cnc/` has the 3 certification-series dates, `/types/cnc-routing/`
has those 3 plus the 2 Big CNC ones - so the superset wins. Passing both does
not work: `/types/cnc,cnc-routing/` silently resolves to `cnc` and drops the
rest, which is the soft-404 problem wearing a different hat. leatherworking is
split the same way but both of its tags land on the same single event, so it
needs no entry.

**The longer links cost modules, which is why `--qr` is 1.35in.** An archive
link is about 50 characters against the bare calendar's 32, which pushes the
code from 37 modules to 41. At the old 1.2in box that is 0.743mm per module,
under print-qr.ts's 0.8mm floor; at 1.35in it is 0.836mm. Dropping the trailing
slash does not help - every studio's link sits in the same version bucket. The
header's vertical padding came down from 0.2in to 0.16in to pay for most of the
extra height, so the header grew only 0.071in in the end.

**Two bugs came out of making the link per-studio, and both were the same
mistake.** The box size was a constant in the script *and* a value in the
stylesheet; `--qr` grew to 1.35in and the constant stayed at 1.2in, so the size
check measured a box that no longer existed and warned that every sheet was
under the threshold when none of them was. It reads `--qr` off the computed
style now. And the warning was raised from inside the encode, so it was never
*cleared* - a warning about one studio stayed up after switching to another
whose code was fine. It is recomputed on every render instead. A check that
cries wolf is worse than no check, because the next person learns to ignore it.

**The printed address and the encoded link are one value.** `displayUrl()` is
the only difference between them. A sheet whose footer and QR disagree is a
small lie that is very hard to notice and impossible to spot once it is on a
door.

**Nothing bleeds.** Office printers cannot reach the paper edge, so the green
panel is a plate inside a 0.4in white margin rather than a full-bleed band -
the same relationship every page on this site has to its ground. It also means
`@page { margin: 0 }` is about controlling the geometry, not about bleeding.

**`@page` size has to be rewritten, not set from a custom property.** Page
context is not element context: `size` cannot read a variable and cannot be
nested under a class. So `setPageRule()` replaces the whole rule when the
orientation changes. Without it the sheet is laid out landscape and printed
onto portrait paper, which Chrome resolves by cropping three inches off the
right-hand side.

**The trim pass is measured, and it has to balance.** A cell holds three or four
sessions; per studio that is never reached - the busiest studio-day on the whole
calendar has two - but "everything at Seattle Makers" hits six. `trimCells()`
hides items from the end until the list stops overflowing and prints "+N more".
The property worth testing is not that it fits but that **hidden === claimed**:
on September's whole-space sheet, 69 sessions, 53 shown, 16 hidden, 16 claimed,
nothing still overflowing. Silent clipping would make the sheet wrong in a way
nothing on it admits to.

Its 1px tolerance is *not* the fudge the label auto-fit warns about further up.
There a genuine overflow can be one pixel of glyph side bearing, so `+ 1` hid
real ink. Here the smallest possible overflow is a wrapped line - about nine
pixels - and the tolerance only absorbs the rounding in
scrollHeight/clientHeight, which are integers.

**An empty month hides the weekday strip too.** Showing "SUN MON TUE…" across a
blank sheet reads as a calendar that failed to draw its own rows, which is the
exact impression the written empty state exists to replace. This was wrong in
the first version and only showed up in the printed PDF. `.cal-blank` therefore
carries a border on all four sides, unlike the grid, which has the weekday
strip closing its top.

**Which words the empty state uses matters, and it is the same rule as
/today's.** "Nothing on the calendar" is a claim about the space. It must never
stand in for "we have not looked yet" or "we could not reach the calendar" -
so the poster says "Reading the calendar…" while `events` is null and "Could
not reach the calendar" on a failure. This one gets printed and pinned to a
door, which makes the distinction worth more here than anywhere else on the
site.

**The sheet is scaled by a ResizeObserver, not a `resize` listener.** A tab that
lays out at zero width - loaded in the background, or in a hidden pane - makes
`host.clientWidth` 0, so `fit()` computes a scale of 0 and draws the sheet at
nothing. Becoming visible later does not resize the *window*, so nothing ever
put it right. Found exactly that way: every measurement in a hidden preview pane
came back 0. Same reason /today observes its board.

**Cancelled classes are dropped here and kept on /today, and the difference is
the point.** A board inside the space has to tell somebody who turned up for a
class that it is off. A sheet printed three weeks earlier has no such duty, and
a door sign advertising a class that is not happening is worse than one that
never mentioned it. Sold-out sessions stay but are not marked: availability
printed on a door in week one is a lie by week three. The poster is a schedule,
not a booking system - that is what the QR answers.

**The two title rules are narrow on purpose, and each was checked against the
whole calendar.** Emoji come off the front and back of titles ("🪚 Woodshop
Guided Studio") because a cell is an inch wide, an emoji is a character of it,
and a colour emoji font is the one face on the page that is not self-hosted -
so what lands on paper would depend on the machine. A redundant studio prefix
comes off only when **colon-delimited**: "Sewing: Guided Studio" -> "Guided
Studio". Matching the bare name as well would turn "Screen Printing
Certification" into "Certification" and "Woodshop Basics (4 Part Series)" into
"Basics". `npm test` pins both, including that "Big CNC: Industrial 4′ x 10′ …"
is safe because the prefix is "Big CNC", not a studio name.

**Studio names stay lowercase, as studios.ts spells them.** Title-casing on the
poster would mean owning a list of exceptions - "3D", "A/V", "CNC" - in a second
place, and `text-transform: capitalize` renders "a/v studio" inconsistently
across browsers anyway. It also keeps the sheet in step with the reel's chips.

**The studio icons work on green with no knockout variant, because they are
already badges.** Each is dark line art inside a white disc, so the disc is the
button. That is luck rather than design, and a future flat-artwork icon would
disappear into the panel.

**The whole-space sheet is headed "what's on", not "Seattle Makers".** The
eyebrow above it already says Seattle Makers, and a heading that repeats it
tells a reader nothing about the list underneath.

**"Nothing chosen" is a third state, not an empty string.** The studio select's
empty value used to mean *everything*, which made "no choice" unrepresentable -
so the page opened on a finished 69-session sheet for a decision nobody had
taken, and the one control that matters sat above a page of output nobody had
asked for. `choice()` now returns `'none' | 'all' | Studio`, `?studio=all` is
what asks for the whole space, and an unrecognised slug falls back to `'none'`
rather than to everything: a mistyped link should land on the instructions, not
quietly print something else.

`render()` returns early on `'none'` - there is no sheet to draw, measure or
print - and that early return has to clear `host.style.height`, because `fit()`
sets it by hand and a stale 1056px leaves a hole under the placeholder where
the sheet used to be. The ResizeObserver skips a hidden host for the same
reason.

**But the month, paper and note controls stay live with nothing chosen.** They
are settings for the sheet you are about to make rather than properties of one
that exists, and freezing them makes the page feel broken before it is used.
The one thing that has to be lifted above the early return is the month label:
left to the markup default it read "—" next to two working arrows, which is a
bug rather than restraint.

With nothing chosen `writeUrl()` writes a bare `/calendar` rather than a query
string. A link carrying a month, a paper size and a note but printing nothing
is a link that looks like it does something.

**The sidebar CSS is duplicated from /labels rather than shared.** Roughly 200
lines of `.cal-*` mirror `.lb-*`. That was deliberate: /labels is a verified
print tool and a shared-stylesheet refactor would put it at risk for a cosmetic
win. If a third tool wants the same chrome, that is the moment to extract it -
two copies is a coincidence, three is a component.

**The first six-week month with data will be January 2027.** The calendar
currently runs to December 2026 and every month in it fits in five rows, so the
six-row path was verified by forcing `--weeks` and measuring rather than by
rendering real data into it. The geometry is proven; what has never been seen is
a *full* six-row sheet, so check the trim pass on one when the calendar reaches
it.

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

**`/api/events` is served by two runtimes from one module.** The Cloudflare
Worker in production, and a middleware in the Astro dev server via an
integration in `astro.config.mjs`. Both call `calendarResponse()` in
`src/lib/calendar-api.mjs`, so they cannot answer differently.

That middleware exists because `astro dev` used to 404 on the path. It was
invisible while the board could fall back to a baked calendar, and became
"every day I pick is empty" the moment the fallback was removed - which is
exactly how it was found. `astro preview` is a different server and still does
not get it; use `npm run serve` for a production-shaped check.

`calendar-api.mjs` is plain `.mjs` with no Node built-ins, for the same reason
`parse-calendar.mjs` is: a Workers runtime has none.

**Astro restarts on `astro.config.mjs` changes but not on changes to modules
the config imports.** The config is bundled once at startup, so
`calendar-api.mjs` gets inlined; editing it leaves the dev server running the
version from when it booted. This produced a genuinely confusing middle state -
`/api/events` worked, because the config itself had changed and triggered a
restart, but `?day=` did nothing, because only the imported module had. Restart
the dev server after touching anything the config pulls in.

**And check what is actually holding the port.** A dev server left running from
eleven days earlier held 4321 through this whole session; every `astro dev`
started against that port failed to bind and exited, silently, while the old
process kept answering. `lsof -nP -iTCP:4321 -sTCP:LISTEN` then
`ps -o lstart= -p <pid>` is the two-command check, and the start date is the
tell.

**Annotate `astro.config.mjs` rather than reaching for `@ts-ignore`.** It
carries `// @ts-check`, so an untyped middleware callback puts four implicit-any
errors into `npm run check` - which matters here because that command's output
is only useful as a *number* compared against the known 8 pre-existing ones.
JSDoc on the integration and the request handler keeps it at 8.

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

**Cancelled classes are only signalled in the title**, which is also why
`isOff` is passed into `statuses()` from today.ts rather than living in
lib/day-status.ts. Organisers edit
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

**For /calendar the checks are measurements, not eyeballs.** Chrome was driven
over CDP - `--remote-debugging-port`, then `Runtime.evaluate` and
`Page.printToPDF` with `preferCSSPageSize: true` - which is a dozen lines using
Node 22's global `WebSocket` and no packages. That is what made it possible to
assert the things that matter rather than look at them: the grid is the same
height at five and six weeks, the footer sits exactly `--sheet-pad` above the
paper edge, hidden sessions equal claimed ones, no list is still overflowing
after the trim, nothing overflows horizontally at 375 and 320, and the printed
QR decodes off the raster.

It also prints with `printBackground: false` deliberately - anything else would
be testing a dialog nobody has touched yet.

Two traps found only because the checks were numeric. A preview pane reporting
zero layout turned every `getBoundingClientRect()` into 0, which is what
surfaced the scale-to-zero bug behind the ResizeObserver note above; and the
`and<b>Background graphics</b>` whitespace collapse was invisible in a
description and obvious in a screenshot of the rendered hint.

## Keeping this file current

When something is learned the hard way, it belongs here under *Implementation
notes* or in a comment next to the code - mechanism, derivations, how an
investigation went, a decision that reversed, a constant that only means
something inside this project. Most of this file is that, and it is the reason
a change that looks obviously right often is not.

The bar is whether it would save the next person the hour it cost you. A note
that only records what the code already says plainly is not worth the space.
