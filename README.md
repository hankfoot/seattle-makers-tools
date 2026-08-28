# seattle-makers-tools

Small web tools for Seattle Makers, all on one static site.

| Tool | Path | What it does |
| --- | --- | --- |
| Slideshow | `/slideshow` | A looping reel of studio photos and upcoming classes, for running full-screen at markets and tabling events. |

Astro + Tailwind v4, static output. Every asset is local — once the page has
loaded, the reel keeps running with the network unplugged.

## Getting started

```bash
npm install
npm run dev
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server at http://localhost:4321 |
| `npm run build` | Static site into `dist/` |
| `npm run preview` | Serve the built `dist/` |
| `npm run events` | Refresh event data from seattlemakers.org |
| `npm run qr` | Regenerate the QR codes in `public/brand/` |

## Running the reel at a market

Build it, serve `dist/`, and open Chrome in kiosk mode:

```bash
npm run build && npm run preview
```

```bash
open -na "Google Chrome" --args --kiosk --app=http://localhost:4321/slideshow
```

`Esc` leaves kiosk mode. The page requests a **screen wake lock**, so the
display should not sleep while the reel is running — but check the machine's own
power settings too, since a wake lock cannot stop a system-level sleep.

### While it runs

Move the mouse and a **control bar** fades in at the bottom-right: previous,
pause/play, next, a dwell progress bar, the slide counter, speed down/up, the
QR code, and full screen. It hides again after a couple of idle seconds, along
with the cursor, so an unattended machine shows nothing but the reel.

The same actions have keys:

| Key | |
| --- | --- |
| `space` | pause / resume |
| `←` `→` | previous / next slide |
| `q` | show / hide the interest-form QR |
| `f` | toggle full screen |
| `esc` | close the QR |

Resuming from pause restarts the slide's full dwell rather than finishing a
part-spent one, so the slide you unpaused on gets a proper look.

### The interest-form QR

Press `q` (or hit the QR button) and a full-screen card goes up with a large
code for **seattlemakers.org/interest** — the interest form and liability
waiver — for holding out to someone who wants to sign up on the spot. Clicking
anywhere or pressing `esc` dismisses it.

Opening it pauses the reel so the slide behind does not change mid-scan, and
closing resumes only if the reel was running beforehand. The same code also sits
on the brand card, where the deck used to have a map.

The codes are **generated at author time** into `public/brand/*.svg` by
`npm run qr`, so the page carries no QR library and makes no network call. To
point one somewhere else, edit the `CODES` list in
[`scripts/make-qr.mjs`](scripts/make-qr.mjs) and re-run it. They use the highest
error-correction level, since these get scanned off a screen at an angle in
daylight.

### URL options

| Param | Default | |
| --- | --- | --- |
| `seconds` | `9` | Seconds per slide |
| `fade` | `900` | Crossfade in ms |
| `studios` | all | Comma-separated slugs, e.g. `?studios=woodshop,ceramics` |
| `events` | `1` | `?events=0` for photos only |

## Adding a studio's photos

Photos are discovered from the filesystem, so this is mostly drag-and-drop:

1. Put landscape JPEGs (1920px wide or better) in `public/studios/<slug>/`.
   They appear in filename order; `01.jpg`, `02.jpg`, `03.jpg` is the convention.
2. If the studio is new, add an icon at `public/brand/icons/<slug>.(png|svg)`
   and a line to `STUDIOS` in [`src/data/studios.ts`](src/data/studios.ts).

The reel picks the change up on the next build. Two photos per studio are used
per loop — the deck used three, but that was across six studios; at twelve it
makes the loop long enough that a passer-by waits too long for the events to
come round again. Extra photos in a folder are harmless; `PHOTOS_PER_STUDIO` in
[`src/lib/reel.ts`](src/lib/reel.ts) sets how many are used.

`studios.ts` is also where calendar categories are mapped onto studios — that
mapping is many-to-one on purpose (`cnc` and `cnc-routing` are one studio;
`cosplay`, `design` and `crafts` are topical tags and map to nothing) — and
where `preferEvent` lets you name the class a studio should feature.

## Refreshing events

```bash
npm run events
```

Run it before a market. It rewrites `src/data/events.json`, so rebuild after.

### How event data works

There is no usable API. The WordPress REST API and `/wp-json/` both return 401,
`?ical=1` returns HTML, and `/events/feed/` carries only post-publish dates
rather than event dates. So `scripts/fetch-events.mjs` scrapes the calendar page
— one unauthenticated GET returns about a year of events — and then pulls each
distinct class's blurb from its own page's `og:description`.

Because it is a scrape, it is the part most likely to break if the site is
redesigned. It fails loudly rather than silently: if it parses zero events it
exits non-zero and leaves the previous `events.json` alone.

It also saves each event's own picture into `public/events/`, so an event card
shows the actual class rather than a generic studio shot. Two filters decide
what is worth keeping:

- **under 600px wide** — the site has a batch of 300px category tiles that would
  be upscaled past the point of looking deliberate.
- **under 0.06 compressed bytes per pixel** — size alone does not separate the
  site's logo tiles from real photos, since both arrive at 1220px. Compression
  does: flat artwork squeezes to a fraction of what a photograph needs. On the
  current calendar the logo tiles sit at 0.018–0.054 and every real photo at
  0.080 or above.

Anything rejected falls back to a studio photo. Promotional artwork (a game
night poster, a sew-along flyer) scores like a photo and is kept, which is the
intent — it is real art for that event. If a logo ever slips through, delete it
from `public/events/` and that card falls back too.

Both `src/data/events.json` and `public/events/` are generated but **committed**,
so a fresh clone builds a working reel without touching the network.

**Prices are deliberately absent.** They are not published anywhere
machine-readable — they live behind the cart — and a stale price on a public
display is worse than no price.

### Which events reach a slide

One card per studio, and it sits **directly after that studio's photos** — the
class on offer is for the room you were just looking at.

The pick prefers a **class** over a **certification** over a **meetup**, looking
120 days ahead, so a real class next month beats a certification next week.
Certifications only surface for studios that genuinely have no class scheduled.
Open studio hours, tours and orientations never appear, and neither do sold-out
or cancelled classes — so a studio whose classes are all full has no card that
week. (Organisers mark a scrapped class by editing "(CANCELLED)" into its title
rather than removing the event, so that string is the only signal there is.)

When the ranking is defensible but a different class would sell the studio
better, set `preferEvent` on that studio in `studios.ts` to a substring of the
title. It wins outright whenever it is upcoming, and quietly stops applying once
it is not, so a stale override can never empty a card:

```ts
{ slug: 'electronics', …, preferEvent: 'Programmable LEDs' }
```

The card shows the **event's own photo** when its page had one worth using, and
the **studio icon** on a tinted panel otherwise — never a generic studio photo,
which in that frame would read as a picture of the class itself.

Each card also carries its next few occurrences in the markup, and the browser
reveals the first one still in the future. That way a build from a fortnight ago
still shows a real date instead of advertising a class that already ran.

## Deploying

The output is plain static files. Any static host works; nothing needs a server.

## Layout

```
public/
  studios/<slug>/*.jpg     studio photos (drop-in, discovered at build)
  events/*.jpg             event pictures pulled by the scraper
  brand/icons/<slug>.*     studio icons
  brand/wordmark.png       the SEATTLE makers lockup
  brand/qr-interest.svg    generated by `npm run qr`; commit it
  fonts/                   self-hosted Lato
scripts/fetch-events.mjs   the calendar scraper
scripts/make-qr.mjs        QR generation
src/
  data/studios.ts          studio list + category mapping
  data/events.json         generated; commit it
  lib/events.ts            which events get a card
  lib/photos.ts            filesystem photo discovery
  lib/reel.ts              slide order
  components/              BrandSlide, PhotoSlide, EventSlide, StudioChip
  scripts/slideshow.ts     the runtime
```

## Provenance of the artwork

**Studio photos** come from the shared *Social Media Photos* Google Photos
album, named `NN-album-NNN.jpg`. They show the current Interbay space.

**Photos named `50-deck-NN.jpg`** were extracted from the *Background Reel* PDF.
They are of the **old Wallingford space**, so they sort behind the album photos
and only appear if a studio runs out. Delete them once every studio has enough
current photos.

The wordmark and eight studio icons also came out of that PDF at full
resolution; four icons (ceramics, screen printing, leatherworking, classroom)
are drawn to match, as the deck predates those studios.

The deck's brand card is not reused: it lists eight services and the old
Wallingford address with a Gas Works Park map. `BrandSlide.astro` rebuilds it
with the twelve current studios and the Interbay location.

### Pulling more from the album

The share page embeds its photo list as JSON in an `AF_initDataCallback` block
keyed `ds:1`; each record is `[id, [url, width, height], takenMs, …]` and a
full-size download is that url plus `=w2400`.

Two things to watch:

- **Videos.** Their thumbnails come back with a play button burned in, which
  looks like a bug on a slide. A record is a video when its trailing dict has
  the key `76647426` — 26 of the album's 300 items are.
- **Only the first ~300 records are embedded**, newest first, reaching back to
  2025-07-18; the album itself goes back to 2022. Older ones need the
  continuation token in `data[2]`.

**Still missing photos: leatherworking and a/v studio.** Neither appears in the
album's recent pages. They have icons and will show event cards, but no photo
block until someone adds files to `public/studios/`.
