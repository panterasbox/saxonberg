# Cover slate — what grows over ground, and the arable field

> **Status: UNBUILT.** ⭐⭐ **The owner's priority: the immediate follow-on
> after sugar (MR !439)**: *"I thought it was already built and it's pretty
> core RGO mechanics."* Designed in conversation 2026-10-24 during sugar's
> review, and parked so sugar could merge ahead of harbors-and-boats.
> **Left:** one kernel `Cover` shape over grass, timber and crops ·
> per-species parameters from rows (ends the hard-coded ryegrass) · the
> harvest axis (what a cut takes, how it regrows, a ripeness gate) · the
> arable field crop (`sow`/`harvest` on a field) · sugar's cane fields
> moved onto it · the decision on whether `Plant` keeps `harvest` (which
> is foraging's) · the dead consumer (nothing grazes, nothing eats hay)
> **Size:** a build: kernel seam + trade-farming + a forestry retrofit +
> sugar content

**Sits on:** [soil.md](../../subsystems/soil.md) (the field, the sward) ·
[husbandry.md](../../subsystems/husbandry.md) (the growth model, monocarp vs
polycarp, beds) · [forestry.md](../../subsystems/forestry.md) (the `Wood`
and its `StandMixin`) · [smallholding.md](../../subsystems/smallholding.md)
· [ranching.md](../../subsystems/ranching.md) (grazing, feeding) ·
[farming-slate](./farming-slate.md) (the density axis; this slate takes
its first `Left` item).

## 1. What actually shipped (audited 2026-10-24)

**`SwardMixin`** (`trade-farming/src/lib/Sward.ts`, on `Field`):

- **One stock on the place.** Standing grass as kilograms of dry matter,
  capped at area × 0.3 kg/m² (a real temperate-pasture figure), starting
  at the residual (half).
- **Grows on read.** A stepped integral of peak 0.008 kg/m²/day × area ×
  the limiting factor (the minimum of moisture, warmth, daylength and
  nitrogen, from the field's own soil), slowed by self-shading as it
  fills, rate-penalized below the residual (never a dead field).
- **Drinks the soil** (transpiration), so a dry month reads as grass that
  stopped.
- **Five percept bands**, never numbers: bare · grazed-out · short ·
  ready · ahead-of-them.
- **Land use derived, not declared** (D7): crop, hay, graze and orchard
  fall out of what stands and whether the mouths stand on it.
- **Consumers:** `mow` (hay). **Nothing else.** The grazing hook
  (`grazingDemandPerGameDay`) is implemented by no class — `ranching.md`
  says so: *"Nothing grazes… nothing feeds a head."* So the nitrogen
  cycling, "fertility follows the mouths", the overgrazed band and the
  move-the-herd decision are unreachable.
- **The "Crop" row of its own D7 table** (*"a sown crop standing on it"*)
  **was never built.** `Field` composes no `CultivableMixin`; `plant`/`sow`
  take beds and pots only. `smallholding.md`: *"arable crops still grow in
  beds and pots."* There is no wheat field anywhere in the game.

**`StandMixin`** (forestry's `Wood`) copied the shape on purpose: *"a stand
is a sward of trees… the second instance; a kernel `lib/husbandry/Cover`
is the seam when a third appears."* Its parameters come per species from
the row. It reads its growth factor at derive time rather than
integrating (a stated cheap form).

**Individual plants** (`GrowingMixin` in beds, pots and `Panel`s) are
complete: stages, the polycarp fruit cycle, weakest-link grade, beds as
shared soil.

## 2. Lens pass on the sward

1. **Pedagogy:** the engine is strong (real figures, Liebig minimum,
   self-shading, overgrazing as a rate penalty). Only the haymaking lesson
   is reachable; the grazing lesson the design centers on is not, and the
   staple-crop lesson does not exist.
2. **Creative expression:** a pasture is a row with an area, which is
   good. But the numbers are temperate ryegrass, hard-coded (ceiling, peak
   growth, residual, water use). No tropical pasture, alpine meadow or
   salt marsh. The stand does this right: per species, from rows.
3. **Immersion:** strong; land use is a description. **Participation:**
   a shared pasture is the commons problem, absent because nothing grazes.
4. **Better choices:** the bands are built to drive a decision (move the
   stock) with no stock to move.
5. **Continuity:** fine (a scythe and a mower answer one `mow`).
6. **Economy:** an open loop. Grass becomes hay; nothing eats hay. The
   demand was not there first.
7. **Governance:** untouched (grazing rights would be).

**Verdict:** the SHAPE is right and is the template for arable: a place
carries a growing stock, settled on read, limited by its own soil, read in
words. What is thin is one hard-coded cover with a dead consumer, and the
missing sibling.

## 3. The two axes every growing thing sorts on

| | **what a harvest takes** | **density** |
|---|---|---|
| orchard | the fruit; the tree stays (polycarp) | individual |
| forest (`Wood`) | the whole tree (felling); increment regrows the stand | aggregate (standards counted) |
| coppice (`Panel`) | the stems; the stool regrows | individual stools in a bed |
| sward (hay) | the standing growth; regrows from the roots | aggregate (kg over an area) |
| an annual (wheat) | the whole plant; bare until resown | aggregate |
| **cane, a ratoon** | the stalks; the stool regrows for years, declining | **aggregate** |

- **Cane is closest to sward and coppice:** a cut draws a standing stock
  that grows back from what is in the ground, on a cycle from a stool that
  weakens over the years. What hay lacks is a **ripeness gate**: cane is
  cut when its sugar is up, not when there is bulk.
- **Orchards are individual trees over a sward floor** (Hearts Delight's
  close: clover under three cherries). That is shipped. At scale (400
  trees, yield per hectare) an author may choose aggregate for the same
  species, so growth parameters must live on the species row, not in a
  mixin.
- **Density is the author's choice** (the farming slate's axis): how much
  identity a plant has.

## 4. The design direction

- **One kernel `Cover`** (forestry's own trigger, the third instance):
  grass, timber and crops become rows. Each cover row states:
  - its growth (ceiling per m², peak rate, what limits it, water use);
  - what a cut takes (a share of a stock, a whole count, the lot);
  - how it regrows (from roots or stools, by increment, not until
    resown), and how the stool declines (ratoon, coppice age);
  - whether there is a ripeness gate, and its percept bands.
- **The arable field crop** is a `Field` whose cover is a sown crop:
  `plough` (shipped) gates `sow <seed> in <field>`; the crop replaces the
  sward; `harvest <field>` (or the crop's word) takes one unit of work's
  worth off the standing stock, the way `mow` does.
- **Retrofit:** `SwardMixin` and `StandMixin` become `Cover` with rows.
  The ryegrass numbers move to a row. `Stand` gains the stepped integral.
- **Kernel seam for the verb:** `harvest` is a platform verb and cannot
  name a pack mixin, so the kernel declares the interface ("a cover you
  can harvest from"), the `Workable` precedent.

## 5. Open questions (settle these first)

1. Does the per-plant growth model (stages, flowering, fill, ratoon) run
   ONCE per field, or does a crop cover get its own simpler curve?
2. What a harvest takes per act, the labor it costs, and the yield in
   words.
3. After the harvest: stubble, weeds, sward creeping back, fallow,
   rotation, the nitrogen spent. Ratoon cane regrows; wheat does not.
4. Sowing: seed rate, and the plough as the gate.
5. The dead consumer: does arable wait for grazing and feeding, or does a
   crop's demand stand alone? Cane's does: the mill eats it.
6. Ownership of a crop on titled ground; the smallholders' fields.
7. ⚠ Whether `Plant` keeps affording `harvest` (see §6). That is
   foraging's question (wild plants), and foraging is undesigned.

## 6. What sugar shipped as a stopgap (and this build replaces)

Sugar's estate needed fields of cane, and there is no arable field. So W5
put six `standing-cane` plants loose into each `SingletonField` as props, and
nothing afforded `harvest` on a plant standing in no bed. Sugar then:

- moved `harvest` onto the kernel `Plant` (retiring medicine's
  `PhysicPlant`, which had done the same in a pack);
- added `Growing.ripeSibling()` so `harvest cane` finds a ripe stool among
  the loose ones.

**The owner questioned it:** *"we will need to deal with plants in the
wild and at that point I'm sure we'll want harvest on plant. But we
haven't designed foraging yet so I'm not sure this should be happening
right now."* It stays for sugar's merge because it works and is driven.
This build moves the cane onto the field's crop cover, then decides §5.7.

## 7. Sugar's estate fuel — the loop nobody runs

The train floor burns oak from a woodpile (30 logs, about a shift and a
half). The historical fuel is the mill's own **bagasse**, dried and carried
to the stoke-hole. The mill yard makes bagasse onto a drying heap, but no
hand carries the dry bagasse to the train, and no one restocks the
woodpile. A self-sustaining estate needs one of the two. It sits with the
cover build because both are about an estate's land feeding its works.
