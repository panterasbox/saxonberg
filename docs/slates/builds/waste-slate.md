# Waste — how trash gets to being gone

> **Status: UNBUILT · opened 2026-10-18 (user, during the cleanliness MR review !380).**
> **Left:** whether waste must be COLLECTED and moved before it is
> destroyed · transformation on the way (composting, rotting, salvage) ·
> who does the collecting · abandoned things' ownership · bounding what a
> kept place accumulates.
> **Size:** a build.

## ⭐ The framing (user, 2026-10-18)

> *"I don't think we need trash dumps in the game just taking up memory, so
> eventually I think the answer is just dest trash, but how the trash gets
> there is the interesting conversation. Does it need to be collected and
> moved somewhere central before it's dested? What about transformation
> like composting."*

So the END is settled — **waste is destroyed** (`StuffApi.destruct`); no
dump persists as state. The design is the ROUTE: what has to happen to a
thing between being waste and being gone, and who does it.

## What ships (cleanliness, !380)

- **Refuse → compost.** `dispose <refuse> on <midden>` (`Midden.takeRefuse`):
  a heap of sweepings, byre muck, bark — and **rotten food** (B47) — is
  destroyed and its kilograms become litres of compost in the midden's
  bulk; `fill sack from midden` takes it to a bed (organic matter). The
  campus midden's own row: *"not a waste-disposal problem: the return leg
  of the nitrogen ledger."*
- **Rot away** (B47): food rotten for `freshness.rotAwayAfterS` (3 game
  days), lying LOOSE in a room, is destroyed and leaves crumbs on the
  floor — debris the broom heaps and the midden takes. In a pot, a pack or a
  hand it waits.
- **Memory** is a separate, engine-only culler (residency's eviction) — not
  this design; the fiction never sees it.

## The questions

1. **Collected before destroyed?** Today a heap is destroyed at the midden,
   so carrying it there IS the collection. Generalize: does every kind of
   waste need moving to a sink (a midden, a cesspit, the river, a
   scrap-heap) to stop being a nuisance — and is the sink the only place it
   is destroyed? The moving is where the labour, and so the trades, are.
2. **Transformation on the way** — by MATERIAL, derived: organic matter
   rots toward compost (a clock the freshness model already runs); glass and
   metal never rot, so they persist until salvaged (the meltable salvage
   ships); textiles go to rags → paper (rag-and-bone). What a sink makes of
   what it takes is the sink's (`takeRefuse` is the shape).
3. **Who does it** — the waste trades are holes in the economy (lens 3b):
   the night-soil man, the rag-and-bone collector, the scavenger, the
   street sweeper. ⭐ *Upkeep is somebody's income*: clean streets are a
   civic job the polity pays for, and a dirty town is a measurable choice.
4. **Abandoned things** (lens 7) — a chattel's title stays with its owner;
   whose is an UNOWNED thing left in a public place — the finder's, the
   town's, nobody's until it rots?
5. ⚠ **Kept places accumulate** — since cleanliness, a kept place
   (cookhouse, chandlery, lavoir, bathhouse) persists its loose contents
   across restarts. Rot-away bounds the food; non-perishable junk (a log,
   a carcass's bones, a broken tool) still piles up with nothing clearing
   it. The bound belongs here.

## Related

- `docs/subsystems/cleanliness.md` (§ Places — the floor, the heap, the
  midden), `spoilage.md` (the bands; rot-away), `residency.md` (memory, not
  this), `watershed.md` (a sewer is a conduit reversed — the liquid sink),
  `soil.md` (organic matter, where compost goes).
