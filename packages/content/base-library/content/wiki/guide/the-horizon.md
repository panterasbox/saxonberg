---
title: The horizon
tags:
- guide
- perception
- navigation
related:
- guide:doors-and-ways
---
# The horizon {#the-horizon}

`look` tells you what one thing is like. `query horizon` lists what you can
see from where you stand that is **not** in your room: the towers and lights
on the skyline, the ships on a sea you look out over.

```
> query horizon
You can see the terminal clock tower, to the south, some 5 miles off.
You can see the light on Gannet Rock, to the east, some 18 miles off.
```

## What decides it {#what-decides-it}

Nothing on the horizon is written down as "visible from here". It is worked
out from where you stand and how high your eye is:

- **The world is round.** A low eye sees a short way; climb a hill, a tower
  or a lighthouse gallery and the horizon moves out. A tall thing is seen
  from further than a short one.
- **Weather shortens it.** Rain closes it in; fog takes nearly all of it.
- **Night leaves only lights.** After dusk you see what shows a light — a
  lighthouse, a ship's riding lights — and nothing else.
- **Roofs end it.** Indoors, or below decks, there is no horizon.
- **Landmarks come first**, then a handful of the most prominent things in
  view. A place's author can block a view (a ridge, a high wall) or name a
  sea a shore looks out over.

## The rough direction, and the exact one {#bearings}

Everyone is told the rough direction: a compass point and about how far.
Something standing in your own town is simply **close by**.

The exact bearing is an act. `measure bearing <it>` with a hand-bearing
compass (or `analyze bearing <it>` by eye, roughly) gives degrees and how
sure you can be; practice at Navigation narrows it. At sea, a bearing on
something that never moves, a light on its rock, fixes your position. Ashore
it is a line you stand on: take a second bearing on another mark and where
the two lines cross, you are. A tower in your own streets is too near to take
a bearing across.

`measure latitude` with a sextant, under an open sky with the sun up, tells
you how far north you are, at sea or ashore.

See `help query`, `help measure` and `help watch`. To be told when something
comes into view or drops out of it, keep a watch: `watch horizon`.
