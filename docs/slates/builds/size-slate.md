# Size slate — how big things are, and what fits

> **Status: UNBUILT** — a light design pass, 2026-10-19, out of the harbor
> session (*"I never expected for things to have much relative size, but as it
> turns out we've modelled real measures in meters in quite a few places. This
> makes me want to use it."*). Exits declare no size today.
> **Left:** sizes as real measures, derived where they can be · a body's
> envelope (stature × posture, girth, plus what it carries, worn and mounted) ·
> exits with a clearance and defaults by kind · refusals that say what would
> work, never auto-posture · things through openings by longest dimension
> against the diagonal · first consumers (doorways and crawlways, water depth
> against stature, seeing over, reach, places built for a people's size,
> containers) · accessibility and building codes
> **Size:** a build

## What is already measured

- **Bodies** — every species' `baseMass` (kg) and `stature` (m), resolved per
  body ([race.md](../../subsystems/race.md): biped 70 kg, 1.75 m); physiology's
  per-individual stature.
- **Rooms** — a real linear extent (cell size × grid); ranged caps a fight's
  distance with it.
- **Structures** — `heightM`; ships' deck and masthead heights.
- **Vessels** — `interiorVolume`. **Things** — mass and material density, so
  volume is derivable.
- **Bands** — real widths. From the ships session: craft draught, beam, length,
  air draft; quay length, channel width and depth.
- ⚠ **Exits** — no size at all.

## 1. Real measures, derived where they can be **[LEAN]**

Meters, never size categories (no *small / medium / large*). Declare a size only
where nothing can derive it: a thing's **volume** from mass and density; a body's
**height** from stature; its **girth** from mass and stature (physiology's
build).

## 2. ⭐ A body's envelope **[LEAN]**

- **Height = stature × posture** — standing 1.0, crouching ~0.6, crawling ~0.35,
  lying its length (posture ships).
- **Girth** — derived from mass and stature.
- **Carried and worn things add** — a pole held, plate armor's bulk, a pack.
- **Mounted** — the mount's height plus the rider's seated height.

## 3. Exits declare a clearance **[LEAN]**

A width and a height, with **defaults by kind** — an ordinary door ~0.9 × 2.0 m,
an outdoor way unbounded — authored only where special: a low door, a crawlway, a
cat flap, a portcullis, a kobold tunnel. The test is the envelope against the
clearance.

## 4. ⭐ The refusal tells; it never crouches for you **[LEAN]**

*"The lintel's too low to walk under — you'd have to stoop."* · *"Even on your
belly you won't fit through there."* Changing posture is the player's act (*the
engine must not do the player's job*), and *the refusal is the progression UI*:
it names what would work.

## 5. Things through openings **[LEAN]**

By the thing's **longest dimension against the opening's diagonal** — the real
geometry of the wardrobe and the stairs. A thing's dimensions derive from its
volume and its form class, or are authored for long things (a bole's length
already is).

## 6. First consumers **[LEAN]**

1. **Doorways and crawlways**.
2. ⭐ **Water depth against stature** — build-4's column uses a fixed wading
   depth of 1.5 m; it should be **the body's stature**, so a child swims where
   an adult wades.
3. **Seeing over** a wall or a crowd — the tall see over, the short cannot see
   over the bar.
4. **Reach** — stature plus a weapon's length; the top shelf; climbing.
5. ⭐ **Places built for a people's size** — the shipped species include
   `koboldus` and `ogrus`; a kobold tunnel admits the small and refuses the big;
   an ogre's hall.
6. **Containers by dimension** — the sword that won't fit the chest; how many
   bodies a room, a lifeboat or a lift holds.

## 7. The lens pass (light)

1. **Pedagogy** — ⭐ **the square-cube law**: mass follows stature cubed, so an
   ogre twice a human's height weighs about eight times as much — derived, and
   taught; the **moving-sofa problem** (a real open problem in mathematics).
2. **Expression** — authors build places for a people's size.
3. **Immersion** — the stoop under a low beam, the crawl, the piano on the
   stairs.
4. ⭐ **Values — accessibility**: a built environment can exclude bodies — a door
   too narrow for a wheelchair; a city built for humans that shuts out ogres.
5. **Continuity** — none special.
6. **Economy** — the removal man who knows how to get the piano up the stairs.
7. ⭐ **Governance** — **building codes can require clearance**: a polity deciding
   whom its buildings admit; it meets [construction-slate](./construction-slate.md).

## Related

[ships-and-harbors-slate](./ships-and-harbors-slate.md) (craft and harbor
dimensions) · [river-slate](./river-slate.md) (air draft under a bridge) ·
[underwater-slate](./underwater-slate.md) (the wading depth) ·
[construction-slate](./construction-slate.md) (codes) · textiles' shipped fit.
