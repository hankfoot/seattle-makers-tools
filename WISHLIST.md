# Wishlist

This file tracks the things we want that are not code in this repo. Most of it
is calendar content, and most of it is somebody else's to do. Work that belongs
in this repo goes in CLAUDE.md under *Next* instead.

Every figure below was measured against the live calendar, and each one has the
command to re-check it underneath, because the numbers will drift.

---

## For the event coordinator

These notes have not been sent to anyone yet.

Everything below asks someone to fill in a field that WordPress already
provides. None of it asks anyone to maintain a second copy of anything for the
tools to read.

### 1. Short summaries for each class

Nobody writes a summary for an event today, so WordPress generates one by
taking the beginning of the event body, stripping out the formatting and
cutting it off at a character count. The results read badly. Two examples from
the live calendar:

> …required prior to using the woodshop Working on a project and want a bit of
> backup?

> …in a relaxed and encouraging atmosphere! What's covered 🌞 Printing films &
> burning screens Films Choosing proper mesh count Screen exposure and […]

The first has a heading running straight into the paragraph beneath it, and the
second has a bullet list flattened into one run-on line. Our code cleans these
up as far as it can, but the real fix is in the event body.

Three of the eight events we sampled end in the "[…]" marker that WordPress
adds when it cuts text off, and that marker only ever appears on an
automatically generated summary.

There are two ways to fix this, and they are worth doing in this order.

The first is to begin the event body with one or two ordinary sentences, with
no heading, no bullet list and no "Prerequisites:" line above them. That alone
fixes the generated summary, it needs no new fields, and there is nothing to
remember afterwards. If only one thing changes, this should be it.

The second is to fill in the Excerpt box for the classes where the opening
paragraph does not work as a summary on its own. It sits at the bottom right of
the event editor, labelled "Excerpts are optional hand-crafted summaries of
your content," and it is currently blank on every event. Whatever is typed
there is used exactly as written.

Two of your own event pages already have good examples:

> Stop by and chat with local screen printing enthusiasts.

> Become certified to use the 3D printers at Seattle Makers!

A good excerpt is one or two complete sentences of roughly 180 characters that
say what the class actually does. Someone reads it from across a room while
deciding whether to walk over, so the first six words carry most of the weight.
There is no need to repeat the name of the class, because it sits directly
above.

We checked four places on the live site to see where the excerpt ends up:

| Surface | Uses the excerpt |
| --- | --- |
| Site search results | yes, underneath each result title |
| Link previews in Slack, iMessage and Facebook | yes, as `og:description` |
| The events RSS feed | yes, and 6 of 10 items end in `[…]` |
| The calendar grid at `/events` | no |
| The `/event_type/…` archives and `/events/list/` | no |

The description in the RSS feed and the `og:description` on the page are
character-for-character identical, so filling in one field improves all three
surfaces at once. The calendar grid and the archive pages show no descriptions
at all, so nothing changes there.

Yoast also provides an SEO meta description and a Facebook description, and
either one would override the excerpt for link previews. Neither is set on any
event today. The Excerpt box is still the better place to write, because it is
a core WordPress field rather than one plugin's, so it survives a change of SEO
plugin, and it is the only one of the three that also reaches search results
and the feed.

There is one question we cannot answer from outside. When a recurring class
goes back on the calendar, is the previous instance duplicated or is a new
event created from scratch? If it is duplicated then the excerpt carries over
and writing one is a one-time cost per class. If each instance is new then the
excerpt has to be written every time, and the first suggestion matters a great
deal more than the second.

*Re-check: `curl -s "$API?day=YYYY-MM-DD" | python3 -m json.tool | grep summary`*

### 2. Studio tags

Before a screen can tell someone that ceramics is through the double doors on
the left, every class has to say which studio it happens in. Today they do not:

| | |
| --- | --- |
| Events with no studio tag at all | **39 of 166** (23%) |
| Studios with no tag that maps to them | **metalworking, a/v studio** |
| Same studio under two tags | `cnc` and `cnc-routing`, `leatherworking` and `leatherworking-sewing` |
| Tags that do not match what the space calls the room | `woodworking` is the woodshop, `print-making` is screen printing |
| Not studios, but stored in the same field | `design` (7), `crafts` (6), `cosplay` (4), `workshop` (4), `seasonal` (3), `wheel` (1) |

What we would like is one tag on each event naming the studio the class
physically takes place in, chosen from a fixed list and kept separate from the
topical tags. The topical tags are useful and should stay. The problem is only
that we cannot tell a room apart from a subject.

*Re-check: `curl -s "$API" | python3 -c "import sys,json,collections; print(collections.Counter(c for e in json.load(sys.stdin)['events'] for c in e['categories']))"`*

### 3. Session times for multi-part courses

A course listed as a "4 Part Series" publishes the end date of its final
session, so read literally the course is running continuously for three weeks.
We work around this by assuming each session ends at the published clock time
on the day it starts. That assumption holds for every multi-day event currently
on the calendar, but it is still an assumption.

The event editor has a Day Variations field, described as "If the event occurs
on specific days during the event period with various times, you can set them
here for display." If that information reaches the public page we can use it
instead of guessing, so somebody should check whether it does before asking
anyone to fill it in.

### 4. Featured images

This one is low priority and it affects the slideshow we run at markets rather
than the board in the space. An event with no picture falls back to a generic
studio icon, and a photograph of the class itself would be better. The field is
already in the editor.

---

## Ideas for the tools

None of these are commitments. Move one into CLAUDE.md under *Next* when it
turns into work with a clear shape.

- **A content report.** A script that lists which upcoming events have no studio
  tag and which are running on an automatically generated summary, so that the
  notes above can be sent with a specific worklist attached instead of asking
  somebody to go through 54 events.
- **Directions on the board.** Once the studio tags are reliable, each class can
  carry a line saying where in the building to go. This needs a map from studios
  to locations, which is ours to write and depends on nobody else.
- **Prices on the board.** Member and non-member prices are in the event editor,
  and the class we looked at had $95 and $125. They cannot be parsed cleanly
  from the public page, so this needs a way in before it needs a design.
- **A view of the whole week.** The board answers what is on today, and a wall
  by the door could reasonably answer what is on this week.

---

## Housekeeping

Add something here when it is wanted but is not yet work. Take it out when it
becomes one or the other, either into CLAUDE.md under *Next* if we are going to
build it, or into a message if somebody else is going to act on it. Anything
that has sat here untouched for a year was never really wanted, so delete it.
