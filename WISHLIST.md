# Wishlist

## 1. Short summaries for each class

Nobody writes a summary for an event today, so WordPress generates one by
taking the beginning of the event body, stripping out the formatting and
cutting it off at a character count. Two examples from the live calendar:

> …required prior to using the woodshop Working on a project and want a bit of
> backup?

> …in a relaxed and encouraging atmosphere! What's covered 🌞 Printing films &
> burning screens Films Choosing proper mesh count Screen exposure and […]

The first fix is to begin the event body with one or two ordinary sentences,
with no heading, no bullet list and no "Prerequisites:" line above them. It
needs no new fields and nothing to remember afterwards. If only one thing
changes, this should be it.

The second is to fill in the Excerpt box for the classes where the opening
paragraph does not work on its own. It sits at the bottom right of the event
editor, it is blank on every event today, and whatever is typed there is used
exactly as written. Two of your own pages already have good examples:

> Stop by and chat with local screen printing enthusiasts.

> Become certified to use the 3D printers at Seattle Makers!

One or two complete sentences of roughly 180 characters, saying what the class
does. The first six words carry most of the weight, and there is no need to
repeat the name of the class.

Where the excerpt appears:

| Surface | Uses the excerpt |
| --- | --- |
| Site search results | yes, underneath each result title |
| Link previews in Slack, iMessage and Facebook | yes, as `og:description` |
| The events RSS feed | yes, and 6 of 10 items end in `[…]` |
| The calendar grid at `/events` | no |
| The `/event_type/…` archives and `/events/list/` | no |

It is one field behind all three, so writing it once fixes all three.

Yoast's SEO and Facebook descriptions would each override the excerpt for link
previews, and neither is set today. Write in the Excerpt box instead: it is a
core WordPress field, so it survives a change of SEO plugin, and it is the only
one of the three that also reaches search results and the feed.

One open question. When a recurring class goes back on the calendar, is the
previous instance duplicated or is a new event created from scratch? Duplicated
means the excerpt carries over and costs nothing the second time. Created fresh
means it has to be written every time, and the first fix matters far more than
the second.

*Re-check: `curl -s "$API?day=YYYY-MM-DD" | python3 -m json.tool | grep summary`*

## 2. Studio tags

Before a screen can tell someone that ceramics is through the double doors on
the left, every class has to say which studio it happens in. Today they do not:

| | |
| --- | --- |
| Events with no studio tag at all | **39 of 166** (23%) |
| Studios with no tag that maps to them | **metalworking, a/v studio** |
| Same studio under two tags | `cnc` and `cnc-routing`, `leatherworking` and `leatherworking-sewing` |
| Tags that do not match what the space calls the room | `woodworking` is the woodshop, `print-making` is screen printing |
| Not studios, but stored in the same field | `design` (7), `crafts` (6), `cosplay` (4), `workshop` (4), `seasonal` (3), `wheel` (1) |

We would like one tag on each event naming the studio the class physically
takes place in, chosen from a fixed list and kept separate from the topical
tags. The topical tags are useful and should stay.

*Re-check: `curl -s "$API" | python3 -c "import sys,json,collections; print(collections.Counter(c for e in json.load(sys.stdin)['events'] for c in e['categories']))"`*

## 3. Session times for multi-part courses

A course listed as a "4 Part Series" publishes the end date of its final
session, so read literally the course runs continuously for three weeks. We
assume instead that each session ends at the published clock time on the day it
starts, which holds for every multi-day event on the calendar so far.

The event editor has a Day Variations field for exactly this. Check whether it
reaches the public page before asking anyone to fill it in.

## 4. Featured images

Low priority, and it affects the market slideshow rather than the board. An
event with no picture falls back to a generic studio icon, and a photograph of
the class would be better. The field is already in the editor.

---

## Ideas for the tools

Move one into CLAUDE.md under *Next* when it turns into work with a clear shape.

- **A content report.** A script listing which upcoming events have no studio
  tag and which are running on a generated summary, so the notes above ship
  with a worklist.
- **Directions on the board.** Once studio tags are reliable, each class can
  carry a line saying where in the building to go. Needs a studio-to-location
  map, which is ours to write.
- **Prices on the board.** Member and non-member prices are in the event editor,
  $95 and $125 on the class we looked at, but they cannot be parsed cleanly from
  the public page.
- **A view of the whole week.** The board answers what is on today.

## Housekeeping

Add something when it is wanted but is not yet work, and take it out when it
becomes either: into CLAUDE.md under *Next* if we are building it, or into a
message if somebody else is acting on it.
