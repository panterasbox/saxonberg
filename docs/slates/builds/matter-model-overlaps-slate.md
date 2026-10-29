# Matter-model overlaps — five places the engine answers one question twice

> **Status: UNBUILT · opened 2026-10-28 (owner, ceramics MR !437 review).**
> **Left:** all six overlaps below — each is a design decision, not a
> mechanical merge.
> **Size:** a build (or five small ones, each riding the build named on it).

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

## 1. Crystallizing by solubility vs sugar's graining (survey 6)

- **Salt** crystallizes by solubility. `Material.solubility` and
  `crystallizesTo` (`lib/material/Material.ts` ~241, ~2153, ~2200) are read
  by `Thermal.crystallizeIfOver` (`lib/thermal/Thermal.ts` ~2617). Above
  saturation the excess comes out of solution as the crystal.
- **Sugar** grains by swapping the whole pool. `concentratesTo`,
  `solidsKgPerL` and `boilingPointElevation` (Material ~1836–1879) and
  `DrainSetting.drains` turn the whole pool into the next material at a
  threshold.
- **Both** read `dissolvedSolidsKgPerL`. They disagree on what happens past
  the line: some of the solute leaves, or all of the pool changes.
- **The question.** Is graining a crystallization with its own seeding and
  agitation term? If so, a massecuite becomes crystal plus mother liquor,
  and the curing house drains that liquor; molasses is then what is *left*,
  not a separate row. Or are these two physically different processes that
  happen to read the same number?
- **Rides into:** the next sugar build (`sugar-slate.md`), because the
  strike and the curing house are the consumers. Salt-making from brine
  would be a second consumer.

## 2. Two leak models: a porous face vs a sprung stave (survey 7)

- **A porous face:** `Faced.holdsWater` / `weeps` (`lib/material/Faced.ts`
  ~183, ~255). An unglazed or crazed pot weeps through its body.
- **A sprung stave:** `Assembled.leaks()` (`lib/assembly/Assembled.ts` ~798)
  and `Vat.getClosure` (`Vat.ts` ~156). A cask leaks at a failed joint.
- **The failures:** a cracked cask does not leak, because a flaw is not a
  joint. A stave-built vessel with a Faced lining never weeps.
- **The question:** is "does this vessel hold liquid, and at what rate does
  it lose it" ONE read, with the body's pores, its flaws and its joints as
  three terms? The bulk slot would then ask one thing.
- **Rides into:** the next assembly/coopering build. Ceramics' integrity
  merge (R2-D1, done in !437) is the prerequisite, because flaws must be
  one record before a flaw can leak.

## 3. Two seep-receiver finders (survey 8)

- `Bulkable.seepReceiver` (`lib/bulk/Bulkable.ts` ~955) is where a weeping
  pot's water goes.
- `Percolating.percolatesInto` (`lib/bulk/Percolating.ts` ~104) is where a
  hopper's lye drains.
- Both answer "what is under me that liquid falls into." They disagree on
  placement and on the fallback (the floor, versus nothing).
- **The question:** one "what catches my drip" read on Placement, which
  `Mould.creditDrainings` (now a transfer through `'set'`) also needs.
- **Rides into:** the bulk subsystem's next build. This is small enough to
  ride any build that adds a third dripping thing; ⚠ at that point it is no
  longer optional.

## 4. Two wall-to-contents flavor exchanges (survey 10)

- **A learned aroma memory:** `Faced` (`Faced.ts` ~161, with the exchange
  in `Bulkable` ~1096–1117). An unglazed crock remembers what it held and
  gives it back.
- **Authored imparts that get spent:** `Maturing.imparts` / `impartsSpent`
  (`lib/maturation/Maturing.ts` ~496–520). A new oak cask gives vanilla
  until it is spent.
- **The question:** these may be one exchange with two sources. The wall's
  own material (oak: authored and depleting) and what the wall has absorbed
  (a learned memory) would feed the same transfer into the contents. A
  first-fill cask and a reused cask would then follow from one model:
  ex-bourbon is a cask that remembers.
- **Rides into:** the next maturation/brewing build (the cask is the
  consumer that would use both halves).
- ⚠ **Where the exchange lives** (ceramics review, 2026-10-29): the face's
  exchange with its contents (the lead leach, the aroma memory, the weep's
  flow into a receiver) is about 60 lines of `BulkableMixin`, though they
  are the FACE's behavior and Bulkable owns only the payload. When this
  item decides the one exchange, its face half moves onto `FacedMixin`
  (Bulkable keeps the payload and asks the face). It is not moved
  separately, so it is not moved twice.

## 5. Vaporizing a solid vs the vapor route (survey 12)

- **The new path:** `Material.vaporizesAboveK` (Material ~1750) and
  `Burner.chamberVapors`, added in !437 for salt glazing (salt thrown into a
  hot kiln).
- **The existing route:** `boilingPoint` / `vapourMaterial` /
  `vapourLPerLPerHour` / `receiveVolatiles`, which carries a still's and a
  pot's vapors.
- **The question:** is a subliming or vaporizing solid the same phase
  change as a boiling liquid, given a rate and a vapor material? If it is,
  the kiln's chamber is a receiver of volatiles like a still head, and salt
  glazing is a vapor depositing on a face.
- **Rides into:** `fire-combustion-slate.md` or
  `destructive-distillation-slate.md`, whichever builds first. Both own
  chamber vapors.

## 6. Two water records on one body: surface wetness vs held moisture (ceramics review, 2026-10-29)

- `WetMixin` is SURFACE water: a coat in the rain, the film that slumps a
  soft green pot (`Greenware` reads its wetness rising), drying off by the
  air.
- `MoistureMixin` is water HELD in the matter (`moisture`, `solute`): what
  a brick, a board, a ham and a bar of soap dry and cure by. Since the
  ceramics MR, rain raises it too (`cure.rewetPerMm`, scaled by exposure).
- **Both are raised by the same rain, independently.** The fire's ignition
  penalty deliberately adds the two ("two waters, one arithmetic"), and
  they are physically different, so this is not a bug. But nothing moves
  surface water INTO a porous body over time: a soaked green brick's film
  never soaks in; only the separate per-mm rule raises its moisture.
- **The question:** for a porous body (by its material's
  `waterAbsorptionCapacity`), is rain one flow — onto the surface, then
  absorbed at the body's own rate into held moisture, with the surface
  film draining what the body cannot take? Then a glazed pot sheds the
  rain and terracotta drinks it, and nobody authors that as a rule. Or are
  the two records kept separate on purpose, with only the doc saying so?
- **Rides into:** the next build that puts a porous thing out in the
  weather on purpose (the cover/arable build's stooked sheaves, a
  construction build's green masonry). Construction's own wall layers are
  the third water record to reconcile when it does.

## Judged legitimately different (not this slate)

The survey's "do not re-litigate" list is recorded in the ceramics plan's
§ *Re-plan R2*.
