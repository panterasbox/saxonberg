# Maritime space — requirements

**Kind:** platform
**Leads from:** [navigable-water-slate](../slates/builds/navigable-water-slate.md)
§§ 1–3c, 5a, 7a · [structures-slate](../slates/builds/structures-slate.md)
**First consumer, in this build:** one water a person can see across, one
water they cannot, a headland that overlooks both, and a building whose
outside is visible from three zones away.

⭐⭐⭐ **The thesis: this realm has one spatial model and needs three.**

Every place in the game is a room on a grid with cardinal exits. That
model is correct, shipped, and it cannot express water — because the
thing a person does on water is **cross it**, and the thing they do in a
room is **be in it**. We thought the spatial question was settled months
ago and it was, for land. Maritime content is the case nobody checked.

> | register | a position is | what it needs to look like |
> |---|---|---|
> | **the grid** | a room, with cardinal exits | a **map** — everything shipped |
> | ⭐ **a passage** | **a fraction along one dimension**, two neighbours | a **line with you on it** |
> | ⭐⭐ **a field** | **a coordinate with NO neighbours** | a **bearing and a distance** |

**The whole build is the second and third registers, and the one authored
fact that chooses between them.**

---

## What already exists

- **Zones** carry a coordinate frame, field inheritance and the
  cardinal-only-intra-zone exit rule, and they already stamp the frame
  onto everything positioned in them. ⚠ But the frame's surface is
  **narrowed to rooms** — one consumer's constraint on a general
  mechanism, and the narrowing is what makes a water impossible to
  express.
- **Elevation** is a zone field with an ancestor walk, and pressure
  already derives from it. ⭐ So *height above a datum* is solved, and
  an eye height is derivable today.
- **The watercourse** ships with reaches, derived navigability that
  changes with the season, flow as a takeable volume, and a shore
  feature that **cites** a water rather than containing anything. ⭐ The
  citation pattern is the one this build generalises.
- **Weather** is a stateless procedural field that is a pure
  deterministic function of time and place, with an exact precipitation
  integral. ⭐ Which is what makes a *seeded* field legal and a drawn one
  unnecessary.
- **The celestial model** answers the sun's altitude and the day's
  length for any latitude, including the polar limits.
- ⚠ **And nothing says two rooms belong to one building.** Four things
  come close and none claims it: an address prefix, a title, a
  contiguous zone, and a warren of clones of one template.

### ⚠ What is broken or absent, found on the way

1. ⛔ **A water cannot be a place you are.** There is no water a person
   can stand on, no water biome at all, and *"a place that can be
   underwater"* was never the gap — the gap is **a water you cross.**
2. ⛔ **A landmark exists only in the prose of the room next to it.** The
   clock tower on University Avenue can be seen from outside the
   structure and **nowhere else**, and the only way to widen that today
   is to write the sentence into every street room by hand.
3. ⚠ **A prop contributes nothing to its room's prose** — named as a
   defect by the fishing build and still true, which is why a shore, a
   reach's character and a landmark all have nowhere to speak.

---

## Goals

- **A water node is either a place or a passage, and one authored fact
  decides which.** A pond you can see across is somewhere you *are*,
  with details and a cast and exits. The open sea is somewhere you
  *cross*, cited rather than inhabited, where your position is real and
  no room exists. ⭐ **The test is only ever: can you see across it** —
  "lake" is not a category, and a 350-mile lake is a passage.
- **A passage is one-dimensional or two.** On a river or a canal your
  position is a fraction along it and it has exactly two neighbours, so
  it needs a traversal duration and nothing else. On open water your
  position is a coordinate with no neighbours at all.
- ⭐⭐⭐ **Crossing open water is setting a course, not choosing a
  destination**, because there is no exit to take. You declare a heading
  and a rate; the world tells you where you arrived. **And the world
  knows where you are while you do not** — your reckoned position
  accumulates from heading, speed and elapsed time, and drifts from the
  truth by the current and the wind, which you cannot read directly.
  ⭐ Nothing is rolled: the error is accumulated ignorance of a seeded
  field, and being lost is **a condition you work out of**, never a
  punishment.
- **A person can take a fix, at a cost they choose.** By recognising
  something within sight, free. By sounding the bottom, which costs way.
  By an observation of the sun, which **the weather can deny**. ⭐ Or by
  hiring somebody who knows the water.
- **What is around you on open water is what you can see, and that
  differs for every observer.** A masthead sees further than a dory, and
  ⭐⭐ **the advantage is a job somebody is doing** rather than a property
  of the vessel: a ship with nobody aloft is blind by its own choice.
  ⚠ And seeing is **one channel of several** — the model must admit a
  second with a different range from the first, because a thing below the
  surface has no horizon at all and hears further than it sees.
- ⭐⭐ **Open water is not empty.** What passes a lane at this hour on this
  day is a **seeded fact about the world**, so two people an hour apart
  meet the same traffic, a water can be *learned*, and re-entering gains
  nothing. ⭐ The lanes have the traffic, so they have the help — and
  they are hunted out and policed; the empty water has the stock and
  nobody within sight. **Remoteness is both the reason the resource is
  there and the reason you die**, with nobody authoring a tension.
- **A coast is land that cites a water.** A beach is a place on land,
  holding a feature that points at the water beside it — so a person can
  fish, launch, wade and look out from somewhere that is unambiguously
  ashore, and **nothing is ever inside a water's frame.**
- ⭐⭐⭐ **An author can say "from here you can see that," and be
  believed.** A headland overlooks a bay. A tower is visible across a
  district. A lighthouse is visible from open water at a range its
  height decides. ⛔ **And the engine never guesses** — on land the claim
  is authored, because what is in the way is not modelled and a computed
  claim would be confidently wrong; at sea the range is computed,
  because nothing is in the way.
- ⭐⭐ **A building's outside is described once and read from anywhere it
  can be seen**, rather than written into every room with a view of it.
  Which requires something that says *these rooms are one building* —
  and that thing coordinates its rooms without containing them, owns
  only what no room can own alone (the roof, the outside, the way in),
  and is **sparse**: almost nothing is in one.
- ⭐ **A thing that is placed, cited or looked at from elsewhere can
  speak in the prose of the room that can see it**, instead of being
  invisible until examined.

---

## Non-goals

- ⛔ **No vessels.** No ship, no boat, no craft that a person boards. A
  building is this build's consumer for the structure half, and the
  water's consumer is a person standing on a shore, wading, or being
  carried by something that already moves. **The boat wave is next and it
  is not this.**
- ⛔ **No line of sight between arbitrary places, ever.** The authored
  claim is the whole mechanism on land. The moment it is computed, every
  author owes a terrain model and every look becomes a graph walk.
- ⛔ **No underwater.** Depth, the column, the ascent and breath are a
  decided design elsewhere and they are not this build. ⚠ **This build
  must not add a depth field**, because the next one will.
- ⛔ **No weather or climate change of any kind.** This build *reads* the
  weather and the sun and edits neither.
- ⛔ **No ownership model for water.** Who holds a water and what they
  owe is designed and deferred.
- ⛔ **No second register for a room's interior.** Positions *within* one
  space are a different question with a different answer.

---

## Collisions

| | |
|---|---|
| ⚠⚠ **the climate & water build** | **It owns the biome chain and the water pack's temperature.** This build *consumes* a biome for a water's surface and **must not edit the chain**. If this build needs a water biome to exist, it takes a stub and that build replaces it |
| ⚠ **the assembly build** | owns the compartment-with-its-own-air. **This build must not touch it**, which is automatic given no vessels |
| ⚠ **the underwater build (next)** | **depth is its field, not ours.** Leave the frame able to carry one and do not add it |
| ⭐ **four documents cite the vessel decision by section letter** | do not renumber it |

---

## The drive

Against the running game, before the MR opens.

1. **Stand on a shore** that is unambiguously land, and look at the water
   beside it. The water is described, and you are not in it.
2. **Wade in**, and be refused or admitted for a stated reason.
3. **Cross a water you can see across** — arriving at a place, by an
   ordinary exit, because a small water is a place.
4. **Set a course across open water.** Read your position before you
   start, note it, and arrive somewhere. ⭐ Your reckoned position and
   where you actually are are **not the same**, and the difference is
   visible to you.
5. **Be told you are not where you thought**, and recover from it — take
   a sounding, or wait for a sight, or recognise something — and watch
   the uncertainty collapse.
6. **Have the weather deny you a sight**, and say so in the sky's own
   terms.
7. **See another craft at a distance**, and have a second observer at a
   different height **not** see it.
8. ⭐ **Post somebody aloft** and see further than you did a moment ago,
   with nothing about the vessel having changed.
9. **Pass the same lane twice at the same hour on different days** and
   meet the same traffic. **Re-enter and gain nothing.**
10. **Stand on a headland** and see the whole of the bay it overlooks.
11. ⭐⭐ **Read a landmark from three different zones**, described once,
    and from a fourth place see nothing because an author said so.
12. **Approach a coast from open water** and take a fix off a tall thing
    ashore, at a range its height decides.
13. **Look at a building from the street** and get a sentence nobody
    wrote into that street.

---

## Acceptance criteria

1. A water node declares **place or passage**, and if a passage,
   **linear or areal** — three authored facts, and ordinary content
   after that.
2. A person can stand on a **shore** and act on the water it cites,
   while never being inside the water's frame.
3. Crossing an areal passage is **setting a course**, and the arrival is
   computed rather than chosen.
4. A **reckoned** position exists, differs from the true one, and the
   difference is **readable by the player** and not by a number nobody
   sees.
5. **Four fixes** work and cost differently, and at least one of them
   can be **refused by the weather**.
6. Being lost **always has a way out** that is an action, not a wait.
7. Mutual presence on open water is decided by **sight distance from eye
   height**, per observer, and **a second channel with a different range
   is expressible** without reopening the model.
8. Traffic on open water is **seeded**: the same at the same place and
   time for every observer, and unfarmable by re-entry.
9. A **vantage** is authored, names what it overlooks, and is believed.
10. A **landmark** is described once on the thing itself and read from
    every place an author says can see it — ⭐ including, at sea, from a
    range its **height** decides.
11. Something says **these rooms are one building**, coordinates them
    without containing them, owns the outside description and the way
    in, and is **sparse**.
12. A cited or placed thing can **contribute to its room's prose.**
13. ⛔ Every land claim about what can be seen is **authored**. The
    engine computes a sight range **only** where nothing can be in the
    way.
