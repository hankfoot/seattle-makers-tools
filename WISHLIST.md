# Wishlist

## 1. Short summaries for each class

The List view on the [Event Calendar](https://seattlemakers.org/events/) prints
the Excerpt field underneath each event title. Where an event has one, that is
a single readable line. Where it does not, the list prints the whole event body
instead, run-together headings and all:

> Welcome to the fascinating art of analog screen printing! The purpose of this
> course is to gain necessary knowledge of the screen printing studio, while
> expanding and experimenting with advanced techniques & tools in a relaxed and
> encouraging atmosphere! What's covered Printing films & burning screens Films
> Choosing proper mesh count Screen exposure and washout Printing & Curing How
> to tape screens Ink basics and overview …

Of the 100 entries currently in the List view, 68 have an excerpt and 32 print
their entire body. The longest runs to 2,142 characters.

[Ceramics Wheel](https://seattlemakers.org/events/ceramics-wheel-4-part-series-13/)
is the model:

> Get hands-on with clay in this four-session beginner series! You'll learn the
> foundations of wheel throwing and how the full ceramic process works,
> including glazing and firing. Leave with a beautiful finished piece, hand
> crafted by you.

That is three sentences and 237 characters, which is a little longer than it
needs to be. Two sentences and around 150 characters sits better in the list
and on the board in the space:

> Get hands-on with clay in this four-session beginner series! You'll learn
> wheel throwing and the whole ceramic process, from glazing to firing.

The first six words carry most of the weight, and there is no need to repeat
the name of the class.

Where the field shows up:

| Surface | What it prints |
| --- | --- |
| The List view on the Event Calendar | the excerpt, or the entire body if there is none |
| Link previews in Slack, iMessage and Facebook | the excerpt |
| The events RSS feed | the excerpt |
| The board in the space | the excerpt, trimmed to two lines |
| The Calendar view on the Event Calendar | title, time and availability only |

Writing the field once fixes all of them.

Yoast's SEO and Facebook descriptions would each override the excerpt for link
previews, and neither is set on any event. Write in the Excerpt box instead: it
is a core WordPress field, so it survives a change of SEO plugin, and it is the
only one of the three that also reaches the List view and the feed.

One open question. When a recurring class goes back on the calendar, is the
previous instance duplicated or is a new event created from scratch? Duplicated
means the excerpt carries over and costs nothing the second time. Created fresh
means it has to be written every time.

*Re-check: open the Event Calendar, switch it to List, and look for entries
that run past a couple of lines.*

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
