# Wishlist

Things we want that are **not code in this repo** — mostly content on the
calendar, and mostly other people's to do.

Kept separate from CLAUDE.md's *Next* on purpose. That list is engineering work
someone can pick up and finish here. This one is requests, open questions and
ideas: it moves when a conversation happens, not when a commit lands.

Figures below were measured against the live calendar. The command to re-check
each one is under it, because a number in a document rots the day after it is
written.

---

## For the event coordinator

Draft notes. Nothing here has been sent to anyone yet.

The framing that matters: **the website is the source of truth and the tools
just read it.** Nothing below asks anyone to maintain a second copy of anything
for our benefit. Every ask is "put it in the field WordPress already has, and
the screens pick it up on their own."

### 1. Short summaries for each class

**The problem.** The board by the door shows a line of description under each
class. Nobody writes those — WordPress generates them by taking the start of
the event body, stripping the formatting and cutting it off. That produces
things like:

> …required prior to using the woodshop Working on a project and want a bit of
> backup?

> …in a relaxed and encouraging atmosphere! What's covered 🌞 Printing films &
> burning screens Films Choosing proper mesh count Screen exposure and […]

A heading run into the next paragraph; a bullet list flattened into a run-on.
We clean these up in code as far as it can be done, but the fix belongs
upstream, and it is cheap.

*Evidence: 3 of 8 sampled events end in WordPress's own "[…]" cut marker, which
only appears on auto-generated text.*

**What we'd like, in order of effort:**

**a. Lead with a plain paragraph.** Start the event body with one ordinary
sentence or two — no heading, no bullet list, no "Prerequisites:" line first.
That alone fixes the auto-generated summary for that event, with no new fields
and nothing to remember later. If only one thing changes, this is the one.

**b. Fill in the Excerpt box** for classes where the opening paragraph is not a
good standalone summary. It sits at the bottom right of the event editor,
labelled *"Excerpts are optional hand-crafted summaries of your content."* It is
blank on every event today. When it has text, that text is used verbatim and
everything above stops applying.

**What makes a good one** — two of these are already on your own event pages:

> Stop by and chat with local screen printing enthusiasts.

> Become certified to use the 3D printers at Seattle Makers!

One or two complete sentences, roughly 180 characters or less, saying what
you'll actually do. It is read from across a room by someone deciding whether
to walk over, so the first six words carry it. No need to repeat the class name
— it is directly above.

**This is not a favour to us.** The excerpt is not a field we invented to read
— it already drives three things on your own site, and the auto-generated text
is doing all three badly:

| Where it shows | Today |
| --- | --- |
| **Site search results** | the run-on text appears under each event title |
| **Link previews** — Slack, iMessage, Facebook, anywhere the URL is pasted | same text, `[…]` and all |
| **The events RSS feed** | same text again; 6 of 10 items end in `[…]` |

Verified: the feed's `<description>` and the page's `og:description` are
character-for-character the same string, so one field fixes all three at once.

Where it does **not** show, so nothing visible breaks: the calendar grid at
`/events`, the `/event_type/…` archives, and `/events/list/` all show titles and
times only.

**Use the Excerpt box, not the Yoast ones.** Yoast also has a meta description
(SEO tab) and a Facebook description (Social tab), and either would override the
excerpt for link previews. Neither is set today. The excerpt is the better place
regardless: it is core WordPress rather than one plugin's field, so it survives
an SEO-plugin change, and it is the only one of the three that also fixes search
results and the feed.

**Open question we can't answer from outside:** when a recurring class is put on
the calendar again, is it duplicated from the previous instance or created
fresh? If duplicated, the excerpt carries over and this is a one-time cost per
class. If fresh, it is per instance, and (a) matters much more than (b).

*Re-check: `curl -s "$API?day=YYYY-MM-DD" | python3 -m json.tool | grep summary`*

### 2. Studio tags, so we can say where to go

Longer term this is how a screen tells someone *"Ceramics — through the double
doors, on the left."* We can't do it until every class says which studio it is
in. Right now:

| | |
| --- | --- |
| Events with no studio tag at all | **39 of 166** (23%) |
| Studios with no tag that maps to them | **metalworking, a/v studio** |
| Same studio under two tags | `cnc` / `cnc-routing`, `leatherworking` / `leatherworking-sewing` |
| Tag name ≠ what the space calls it | `woodworking` → we call it the woodshop; `print-making` → screen printing |
| Not studios, but in the same field | `design` (7), `crafts` (6), `cosplay` (4), `workshop` (4), `seasonal` (3), `wheel` (1) |

The ask is one tag per event naming the **studio the class physically happens
in**, chosen from a fixed list, kept separate from topical tags like *crafts* or
*seasonal*. Those are useful and we don't want them removed — we just can't tell
them apart from a room.

*Re-check: `curl -s "$API" | python3 -c "import sys,json,collections; print(collections.Counter(c for e in json.load(sys.stdin)['events'] for c in e['categories']))"`*

### 3. Session times for multi-part courses

A "4 Part Series" publishes the **last** session's end date, so read literally a
course is "on now" for three weeks. We work around it by assuming the session
ends at the published clock time on the day it starts — which has held for
every multi-day event on the calendar, but is still a guess.

The editor has a **Day Variations** field: *"If the event occurs on specific
days during the event period with various times, you can set them here for
display."* If that is filled in and published, our guess can be replaced with
the real thing. Worth finding out whether it appears on the public page before
asking anyone to fill it in.

### 4. Featured images

Not urgent, and only affects the market slideshow rather than the board. Events
without a picture fall back to a studio icon. A photo of the actual class is
better, and the field is already there.

---

## Ideas for the tools

Not commitments. Move an item into CLAUDE.md's *Next* when it becomes real
work with a shape.

- **A content report.** A script listing which upcoming events have no studio
  tag and which have an auto-generated summary — so the notes above come with a
  worklist instead of "go and check 54 events."
- **Directions on the board.** Once studio tags are reliable: a line under each
  class saying where in the building to go. Needs a studio→location map, which
  is ours to write and does not depend on anyone else.
- **Price on the board.** Member and non-member prices exist in the editor
  ($95 / $125 on the class we looked at). They are not cleanly parseable from
  the public page today, so this needs a way in before it needs a design.
- **A "what's on this week" view.** The board answers today. A wall by the door
  could reasonably answer the week.

---

## Housekeeping

Add to this file when something is *wanted* but not yet *work*. Move it out
when it becomes either — into CLAUDE.md's *Next* if we are doing it, or into a
sent message if someone else is. An item that has sat here unchanged for a year
was never really wanted; delete it rather than letting the file become a
graveyard.
