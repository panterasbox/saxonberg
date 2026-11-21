# Matter-model overlaps — five places the engine answers one question twice

> **Status:** ABSORBED · opened 2026-10-28 (owner, ceramics MR !437
> review); all seven overlaps built by matter-model-overlaps (MR !644,
> 2026-11-20) and compacted at its sweep. Kept pending the owner's
> retirement call.
> **Left:** nothing — each overlap has one model now (pointers below).
> **Size:** none.

## Where this came from

The ceramics review kept finding the MR re-modelling something the engine
already modelled. A survey of every piece of substrate the branch added,
measured against the whole codebase, found 20 overlaps. The owner split them:
the 6 bugs and 9 duplicates are fixed in !437 (the ceramics plan, § *Re-plan
R2*). The **five below are design overlaps**: each pairs two models, both of
which are partly right, so merging them means choosing which model holds
the truth. That choice belongs to a slate, not to a review round.

Each overlap names the build it rides into (per *a slate must name a build*).
Line numbers are as of 2026-10-28.

## Where each overlap landed (built, MR !644)

1. Crystallizing vs graining → [thermal.md](../../subsystems/thermal.md)
   § Crystallizing — the third arm (nucleation, purity, blackstrap).
2. Two leak models → [bulk.md](../../subsystems/bulk.md) (one leak read:
   pores · flaws · joints), [faces.md](../../subsystems/faces.md),
   [assembly.md](../../subsystems/assembly.md) § Coopering and the cask,
   [ship.md](../../subsystems/ship.md).
3. Two seep-receiver finders → [spatial.md](../../subsystems/spatial.md)
   § What is under it — the drip.
4. Two wall-to-contents exchanges → [faces.md](../../subsystems/faces.md)
   § The wall's exchange.
5. Vaporizing a solid vs the vapor route →
   [biome.md](../../subsystems/biome.md) § The one vapor route,
   [fire.md](../../subsystems/fire.md).
6. Two water records → [spoilage.md](../../subsystems/spoilage.md) § Drying
   is a RATE, [weather.md](../../subsystems/weather.md); construction's wall
   layers → [construction-slate](../trades/construction-slate.md) § 4.
7. A vessel's grade vs its batch's → [bulk.md](../../subsystems/bulk.md)
   § `BulkPayload`, [maturation.md](../../subsystems/maturation.md) § The
   transfer seam.

## Judged legitimately different (not this slate)

The survey's "do not re-litigate" list is recorded in the ceramics plan's
§ *Re-plan R2*.
