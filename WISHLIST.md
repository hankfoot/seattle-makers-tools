# Wishlist

Wants that are **not code in this repo** — mostly calendar content, mostly
other people's to do. Engineering work belongs in CLAUDE.md's *Next*.

Figures were measured against the live calendar. The command to re-check each
one is under it.

---

## For the event coordinator

Not sent to anyone yet.

Every ask below is "fill in the field WordPress already has." Nothing here
asks for a second copy of anything to be maintained for the tools' benefit.

### 1. Short summaries for each class

**Current behaviour.** No summaries are written. WordPress generates them from
the start of the event body — formatting stripped, cut at a character count:

> …required prior to using the woodshop Working on a project and want a bit of
> backup?

> …in a relaxed and encouraging atmosphere! What's covered 🌞 Printing films &
> burning screens Films Choosing proper mesh count Screen exposure and […]

A heading run into the next paragraph; a bullet list flattened. Code cleans
these up as far as it can; the fix belongs upstream.

*3 of 8 sampled events end in WordPress's `[…]` cut marker, which only appears
on auto-generated text.*

**Asks, in order of effort:**

**a. Lead with a plain paragraph.** One or two ordinary sentences at the top of
the event body — no heading, no bullet list, no "Prerequisites:" line first.
Fixes the auto-generated summary with no new fields and nothing to remember
later. If only one thing changes, this is it.

**b. Fill in the Excerpt box** where the opening paragraph is not a good
standalone summary. Bottom right of the event editor, labelled *"Excerpts are
optional hand-crafted summaries of your content."* Blank on every event today.
When it has text, that text is used verbatim.

Two examples already on live event pages:

> Stop by and chat with local screen printing enthusiasts.

> Become certified to use the 3D printers at Seattle Makers!

One or two complete sentences, ~180 characters, saying what you'll do. Read
from across a room, so the first six words carry it. No need to repeat the
class name.

**Where the excerpt appears.** Verified on the live site:

| Surface | Uses it |
| --- | --- |
| Site search results | yes — under each result title |
| Link previews (Slack, iMessage, Facebook) | yes — `og:description` |
| Events RSS feed | yes — 6 of 10 items end in `[…]` |
| Calendar grid `/events` | no |
| `/event_type/…` archives, `/events/list/` | no |

The feed's `<description>` and the page's `og:description` are
character-for-character identical, so one field fixes all three. Nothing
visible changes on the calendar or the archives.

**Use the Excerpt box, not the Yoast fields.** Yoast's SEO meta description and
Social Facebook description would each override the excerpt for link previews.
Neither is set today. The excerpt is core WordPress rather than one plugin's
field, so it survives an SEO-plugin change, and it is the only one of the three
that also reaches search results and the feed.

**Unanswered from outside:** when a recurring class is put on the calendar
again, is it duplicated from the previous instance or created fresh? Duplicated
means the excerpt carries over and (b) is a one-time cost per class. Fresh means
per instance, and (a) matters much more.

*Re-check: `curl -s "$API?day=YYYY-MM-DD" | python3 -m json.tool | grep summary`*

### 2. Studio tags

Needed before a screen can say *"Ceramics — through the double doors, on the
left."* Current state:

| | |
| --- | --- |
| Events with no studio tag at all | **39 of 166** (23%) |
| Studios with no tag that maps to them | **metalworking, a/v studio** |
| Same studio under two tags | `cnc` / `cnc-routing`, `leatherworking` / `leatherworking-sewing` |
| Tag name ≠ what the space calls it | `woodworking` → woodshop; `print-making` → screen printing |
| Not studios, but in the same field | `design` (7), `crafts` (6), `cosplay` (4), `workshop` (4), `seasonal` (3), `wheel` (1) |

Ask: one tag per event naming the **studio the class physically happens in**,
from a fixed list, kept separate from topical tags. The topical tags are useful
and should stay — they just can't be told apart from a room.

*Re-check: `curl -s "$API" | python3 -c "import sys,json,collections; print(collections.Counter(c for e in json.load(sys.stdin)['events'] for c in e['categories']))"`*

### 3. Session times for multi-part courses

A "4 Part Series" publishes the **last** session's end date, so read literally
the course is "on now" for three weeks. Worked around by assuming the session
ends at the published clock time on its start date — holds for every multi-day
event on the calendar, but is a guess.

The editor has a **Day Variations** field: *"If the event occurs on specific
days during the event period with various times, you can set them here for
display."* If it reaches the public page, the guess can be replaced. Check that
before asking anyone to fill it in.

### 4. Featured images

Low priority; affects the market slideshow, not the board. Events without a
picture fall back to a studio icon. The field already exists.

---

## Ideas for the tools

Not commitments. Move an item into CLAUDE.md's *Next* when it has a shape.

- **A content report.** A script listing which upcoming events have no studio
  tag and which have an auto-generated summary, so the notes above ship with a
  worklist rather than "go and check 54 events."
- **Directions on the board.** Once studio tags are reliable: a line under each
  class saying where to go. Needs a studio→location map, which is ours to write.
- **Price on the board.** Member and non-member prices exist in the editor
  ($95 / $125 on the class we looked at) but are not cleanly parseable from the
  public page. Needs a way in before it needs a design.
- **A "what's on this week" view.** The board answers today.

---

## Housekeeping

Add an item when it is *wanted* but not yet *work*. Move it out when it becomes
either — into CLAUDE.md's *Next*, or into a sent message. Delete anything that
has sat here unchanged for a year.
