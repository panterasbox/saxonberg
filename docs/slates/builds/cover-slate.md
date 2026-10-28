# Cover slate — what grows over ground, and the arable field

> **Status: UNBUILT — DESIGNED 2026-10-28 (§ 8).** ⭐⭐ **The owner's
> priority: the immediate follow-on after sugar (MR !439, merged)**: *"I
> thought it was already built and it's pretty core RGO mechanics."* First
> designed in conversation 2026-10-24, parked for sugar's merge; the open
> questions were settled 2026-10-28 (§ 8), and the build split in two.
> **Left:** ⭐ **ARABLE first** (§ 8): a field is a bed with one aggregate
> crop slot · harvest and sow take an AREA per act · plough turns the sward
> under each season · seed rate sets the sown area · ratoon decline · the
> crop is the titleholder's · the island's cane moved onto it (⚠ it dies
> today, § 9) · `Plant`'s `harvest` retired if nothing loose remains.
> **Then COVER** (§ 4): the sward and the stand onto kernel rows (species
> parameters, the stand's full integral). ⭐ **Stage B, grazing and feeding,
> is folded in** (§ 10): the herd stands on a field, eats by metabolic weight,
> its condition follows what it ate, hay in a trough carries the winter.
> **Size:** one large build in two stages: A arable (trade-farming + a kernel
> bed seam + sugar content), B grazing (trade-ranching + the field hook + the
> herd record + the condition coupling). Cover (§ 4) is a later, smaller one.

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

## 5. Open questions (settled 2026-10-28 — see § 8)

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

## 8. ⭐⭐ The design (settled in conversation, 2026-10-28)

Each decision names the lens that chose it ([design-lenses.md](../../design-lenses.md)).

**D1 — A field crop is ONE aggregate plant** (§ 5.1). The per-plant
growth model (stages, flowering, fill, the weakest-link grade) runs once per
field, its yield scaled by the sown area and its water and nitrogen read from
the field's own soil. Mechanically, **a field is a bed with one crop slot**:
"a pot is a bed with one slot" run the other way. *Pedagogy chose:* a staple's
lessons live in its stages (when to sow, frost at flowering, drought in the
fill); a bulk curve deletes the farmer's decisions. *Creative expression
confirms:* the wheat, barley and cane rows already carry the parameters, so a
field crop is the same row at another density. This is also the farming
slate's prior answer ("the aggregate instances it once per field").

**D2 — Arable is not a `Cover`; the split.** The crop is a plant, so it needs
no kernel `Cover`. The sward (regrowing kilograms) and the stand (counted
trees) ARE one shape, a growing stock on a place, and remain the second,
later build (§ 4): parameters onto species rows, the stand's growth factor
integrated rather than read once.

**D3 — A harvest act takes an AREA; the tool sets how much** (§ 5.2). At
ripeness the field holds a standing crop (fruit set × area), graded
weakest-link for the whole field. Each act cuts the tool's area per act off it
and mints that much (a sheaf, a bundle of cane), as real labor time; when the
standing crop is gone the plant settles its cycle (a ratoon) or ends
(stubble). No row-by-row geography: an act takes from wherever the crop
stands. `look` reads it in words ("a third of the piece still standing").
*Pedagogy chose:* harvest is the labor peak, and yield per acre and work per
acre are different numbers; *continuity:* sickle → scythe → reaper is one verb
with a bigger area; *economy:* it makes the seasonal labor demand the estate's
cutters and hired gangs exist for.

**D4 — The sward is the fallow; plough turns it under** (§ 5.3). `plough`
leaves the field ploughed for the season: the standing sward goes into the
soil's organic matter, which mineralizes into nitrogen over the months after.
Each swath exports nitrogen with its yield (the row's `nutrientDraw` scaled
by area) from the field's soil. After a once-cropper's last swath the field is
stubble; left alone the sward creeps back, and that IS fallow, a ley in a few
years. *Pedagogy chose:* the ley-arable rotation falls out of shipped
mechanisms and is never authored. Clearing stays the one-time improvement.

**D5 — Ratoon decline: one optional number on the plant row.** Each cycle
lowers the stool's yield by a share (cane roughly 10–15 %); default 0
(coppice keeps 0). It makes cane's decision: when to grub out tired stools and
replant.

**D6 — Sowing** (§ 5.4). `sow` requires the season's seedbed through the
existing `Improvable.isPlantable` gate (it has no caller today). The seed rate
is on the plant row, per m² (kg of grain; setts for cane), and **seed sets the
area**: a third of the seed sows a third of the field. Each `sow` act covers
an area set by the hand or the tool (broadcast now, a drill later: one verb);
the first act starts the crop's clock. Seed is held back from the crop (the
row names its seed good). Out-of-season sowing is **allowed** and grows badly
in words; warmth and daylength already cap it, and the engine does not forbid
what nature merely punishes. *Economy chose* (seed corn), *pedagogy*
(rate, date, area as decisions).

**D7 — The consumer** (§ 5.5). Arable does not wait for grazing: the mill
eats cane and the grain chain eats wheat. Grazing and hay are scoped in § 10.

**D8 — Whose crop** (§ 5.6). The harvested goods are stamped to the field's
titleholder, never the hand that cut them (a hired gang works for wages);
tenure terms on a holding may say otherwise through the shipped chain of
title. Sowing another's titled field is refused (the `plot` title gate);
harvesting another's standing crop is permitted and recorded as theft, the
shipped rule for taking a good you do not own. *Governance chose:* the
criterion is title, the appeal the chattel record, nothing new entrenched.

**D9 — `Plant`'s `harvest`** (§ 5.7). Arable moves the island's cane onto
fields. If, after that, no row places a loose plant, `harvest` and
`ripeSibling` retire from the kernel `Plant` and foraging adds them back with
its own design; if anything still stands loose (medicine's herbs), it stays
and is recorded as foraging's to settle. The plan checks which; this rule
decides.

**Deferred, with destinations:** weeds and crop disease build-up → this
slate's Left; continuous cropping is penalized only through the nitrogen it
spends.

## 9. ⚠ Corrections to the 2026-10-24 audit (code-checked 2026-10-28)

- **The island's cane dies.** A loose plant has no bed, so its soil moisture
  reads `null` and `satWater(null)` is 0: the limiting factor is 0, the fruit
  never refills after the first cut, and vigor relaxes to death in about 88
  game days. The first crop works only because `standing-cane.yaml` authors it
  ripe (`_fruitFill: 1`). Its `nutrientDraw: 40` does nothing (harvest draws
  only from a bed). **The estate runs out of cane about a season into a
  world.** Arable fixes it.
- **`plough` does not gate `sow`.** It banks one-time `clearing` work and then
  refuses `already-clear`; `Improvable.isPlantable` has no caller.
- **The stand's parameters come from each Wood's `mix:`**, per clearing, not
  per species, and an authored `mix:` is inert once a snapshot exists; its
  growth factor is moisture alone.
- **Ratoon and coppice age are not modelled**: cane is a plain polycarp
  (`fruitSetCount 1`, `fruitFillDays 5`).
- **Wheat and barley exist as bed `Plant` rows** in trade-farming.
- **The plant's parameters are on its `Plant` row**, not `Species`
  (husbandry.md: "migrates onto `Species` in phase 5").

## 10. ⭐⭐ Stage B — grazing and feeding (folded in 2026-10-28)

The owner: *"I want to dig into ranching even if we're not building it now.
Maybe if it's light enough we pull in everything for grazing,"* then *"let's
fold all this in."* It is light on DESIGN (the [ranching
slate](./ranching-slate.md) decided nearly all of it) and medium on code, and
it shares Stage A's field, soil and sward, so it is this build's second stage.
Stubble grazing needs arable to exist, which sets the order.

**What it sits on (shipped):** the herd is a RECORD (the herdbook, anchored by
a `Herdbook` fixture in the byre); a head is an object only when drafted
([ranching.md](../../subsystems/ranching.md) § Draft and return). The energy
cascade (intake → maintenance → cold → growth → production → `flesh`) is
shipped and has no input. The sward has the grazing hook
(`swardGrazingDemandPerGameDay`, eaten = demand × dt per step, organic matter
and nitrogen returned in place, wet-ground poaching, the over- and
under-grazing bands) and no mouths. `Feeder` vessels (bowl · trough · hopper,
a species' kinds) and the pets' `feeds` brain exist for live animals.

**G1 — Where the herd stands: `move herd <field>`** at the herdbook. The
FIELD records which herd grazes it, because the field's read is what needs the
answer (*load on use: a reverse question means the reference points the wrong
way, so flip it*). The herd record keeps its claimed home; containment of a
drafted head is its position, and the disagreement is straying (D95).

**G2 — What a head eats.** Daily dry-matter intake derived from the species'
body mass by metabolic weight (one constant, no per-row authoring), times the
head count, is the field's grazing demand. *Pedagogy:* derivable, not a
table.

**G3 — What was eaten reaches the animals.** The sward reports the share of
the demand it met; the herd record keeps that fed fraction over time; a head's
`flesh` reconciles from it when drafted or read. A seeded per-head share (shy
feeders get less) makes **the tail**, the three thin ones ranching.md says the
management game is about. *Seeded, never drawn.*

**G4 — Hay in winter.** A hay trough on the field or in the byre: when the
sward falls short the herd eats from the trough (the shipped `Feeder`). `mow`
finally has a consumer, and the winter-feed budget (the ranching slate's "year's
spine": enough hay to reach February, or sell down in autumn) bites.

**G5 — Stubble grazing**, the bridge to Stage A: a herd moved onto a harvested
field eats what is there.

*Economy chose (lens 6):* it closes both dead consumers at once, grass gets
mouths and hay gets an eater. *Pedagogy (lens 1):* the winter-feed forecast.

**Deferred (they stay in the ranching slate's Left):** paddock subdivision,
gates and the herd in the wheat (the escape resolved at reconcile) · the hired
hand's grazing cadence and its utilization penalty · breeding and births · the
sward stick (an instrument read of the pasture).
