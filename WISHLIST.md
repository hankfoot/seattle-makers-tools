# Wishlist

## 1. Short summaries

- Right now our only options are WordPress' automatic summary, which cuts
  sentences in half and runs headings into the paragraph, or the full blob of
  body text.
- The Excerpt field lets us write one or two tasteful sentences per class. 68 of
  the 100 entries on the calendar already have one, so this is topping up rather
  than starting from scratch.
- [Ceramics Wheel](https://seattlemakers.org/events/ceramics-wheel-4-part-series-13/)
  is the model, if a little long at three sentences and 237 characters:

  > Get hands-on with clay in this four-session beginner series! You'll learn
  > the foundations of wheel throwing and how the full ceramic process works,
  > including glazing and firing. Leave with a beautiful finished piece, hand
  > crafted by you.

- Two sentences and around 150 characters is the target:

  > Get hands-on with clay in this four-session beginner series! You'll learn
  > wheel throwing and the whole ceramic process, from glazing to firing.

- The field shows up in four places:
  - The List view on the [Event Calendar](https://seattlemakers.org/events/).
    Where an event has no excerpt this prints the entire event body instead,
    which is where the 2,142-character entries come from.
  - Link previews in Slack, iMessage and Facebook.
  - The events RSS feed.
  - The board in the space.
- It does not show up in the Calendar view, which is titles, times and
  availability only.
- Write it in the Excerpt box rather than Yoast's SEO or Facebook description.
  Those two only reach link previews, and the Excerpt is a core WordPress field
  that survives a change of SEO plugin.

## 2. Updates to studio tags

- Standardize the tags so every class can be associated with the studio it
  happens in.
- 39 of 166 events have no studio tag at all.
- Metalworking and the a/v studio have no tag that maps to them.
- The same studio appears under two tags: `cnc` and `cnc-routing`,
  `leatherworking` and `leatherworking-sewing`.
- Some tags do not match what the space calls the room. `woodworking` is the
  woodshop and `print-making` is screen printing.
- The topical tags are useful and should stay: `design` (7), `crafts` (6),
  `cosplay` (4), `workshop` (4), `seasonal` (3), `wheel` (1). We only need the
  studio tag to be separate and reliable.

## 3. Locations on events

- Add the studio or room to each event so the screens can give people
  directions.
- Where a location is set today it is the building's street address, 3012 16th
  Ave W, written seven different ways. 109 of 166 events have no venue line at
  all.
- A street address cannot tell somebody standing in the lobby which way to walk.
- This overlaps with 2. If the studio tags become reliable we can map studio to
  location ourselves, so either ask gets us there.

## 4. Featured images

- Every event should have a photograph of the class as its thumbnail.
- All 100 entries on the calendar show an image, but they come from only 32
  distinct files and several are logos rather than photographs. `laser_logo.jpg`
  appears 11 times and `tour_icon` 5.
- The most reused photograph, `screenprinting-300x284.jpg`, is on 14 entries.
- Our market slideshow already drops the logo tiles and falls back to a studio
  icon, so a real photo per class is what would change what people see.

---

## Ideas for the tools

Move one into CLAUDE.md under *Next* when it turns into work with a clear shape.

- **A content report.** A script listing which upcoming events have no studio
  tag and which are running on a generated summary, so the notes above ship
  with a worklist.
- **Directions on the board.** Needs a studio-to-location map, which is ours to
  write whichever way 2 and 3 land.
- **Prices on the board.** Member and non-member prices are in the event editor,
  $95 and $125 on the class we looked at, but they cannot be parsed cleanly from
  the public page.
- **A view of the whole week.** The board answers what is on today.

## Housekeeping

Add something when it is wanted but is not yet work, and take it out when it
becomes either: into CLAUDE.md under *Next* if we are building it, or into a
message if somebody else is acting on it.
