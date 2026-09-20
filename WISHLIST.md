# Wishlist

## 1. Short summaries

Right now our only options for an event summary are WordPress' automatic one,
which cuts sentences in half and runs headings into the paragraph after them, or
the full blob of body text. The Excerpt field gives us one or two tasteful
sentences per class instead. 68 of the 100 entries on the calendar already have
one, so this is topping up rather than starting from scratch.

[Ceramics Wheel](https://seattlemakers.org/events/ceramics-wheel-4-part-series-13/)
is the model, though it runs a little long at three sentences and 237
characters:

> Get hands-on with clay in this four-session beginner series! You'll learn the
> foundations of wheel throwing and how the full ceramic process works,
> including glazing and firing. Leave with a beautiful finished piece, hand
> crafted by you.

Two sentences and around 150 characters is the target:

> Get hands-on with clay in this four-session beginner series! You'll learn
> wheel throwing and the whole ceramic process, from glazing to firing.

The field shows up in four places. The most visible is the List view on the
[Event Calendar](https://seattlemakers.org/events/), where an event with no
excerpt prints its entire body instead, which is where the 2,142-character
entries come from. It also fills link previews in Slack, iMessage and Facebook,
the events RSS feed, and the board in the space. It does not appear in the
Calendar view, which shows titles, times and availability only.

Write it in the Excerpt box rather than Yoast's SEO or Facebook description.
Those two only reach link previews, and the Excerpt is a core WordPress field
that survives a change of SEO plugin.

## 2. Updates to studio tags

We would like the studio tags standardized so that every class can be associated
with the studio it happens in. Today 39 of 166 events have no studio tag at all,
metalworking and the a/v studio have no tag that maps to them, and two studios
appear under two names each: `cnc` and `cnc-routing`, `leatherworking` and
`leatherworking-sewing`. Some tags do not match what the space calls the room
either, since `woodworking` is the woodshop and `print-making` is screen
printing.

The topical tags are useful and should stay. Design has 7 events, crafts 6,
cosplay 4, workshop 4, seasonal 3 and wheel 1. All we need is for the studio tag
to be separate from those and reliable.

## 3. Locations on events

Adding the studio or room to each event would let the screens give people
directions. Where a location is set today it is the building's street address,
3012 16th Ave W, written seven different ways, and 109 of the 166 entries carry
no venue line at all. A street address cannot tell somebody standing in the
lobby which way to walk.

This overlaps with the studio tags above. If those become reliable we can map
each studio to a location ourselves, so either ask gets us there.

## 4. Featured images

Every event should have a photograph of the class as its thumbnail. All 100
entries on the calendar do show an image, so nothing is missing outright, but
they come from only 32 distinct files and several are logos rather than
photographs. `laser_logo.jpg` appears 11 times and `tour_icon` 5, and the most
reused actual photograph, `screenprinting-300x284.jpg`, is on 14 entries. Our
market slideshow already drops the logo tiles and falls back to a studio icon,
so a real photo per class is what would change what people see.