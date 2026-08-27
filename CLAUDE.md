# CLAUDE.md — seattle-makers-tools

> Read this fully at the start of every session.

## What this is

A suite of small web tools for Seattle Makers, served as one static site.
The first is a looping **slideshow** for markets and tabling events.

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

Next:
- Photos for the 6 studios with none yet (ceramics, screen printing,
  leatherworking, metalworking, a/v studio, classroom). Hank is supplying these.
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

**Cancelled classes are only signalled in the title.** Organisers edit
"(CANCELLED)" into the event name rather than removing the event, so
`src/lib/events.ts` matches that string.

**`[hidden]` needs a global override.** Tailwind's display utilities outrank the
UA stylesheet's `[hidden]` rule, so a `flex` element with the `hidden` attribute
stays visible. `global.css` forces it. This bites the event card, whose
occurrence options are flex rows toggled by `hidden`.

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
