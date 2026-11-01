# Field population — requirements

**Kind:** feature
**Leads from:** kernel. The first consumers are the Hearts Delight bench
and the campus home field, in this build (cover, MR !480).

A field crop today is one number with a stage: the field answers `look`,
but there is no plant in it you can pick out, follow or tend. That makes
big farming and small farming two different player skills, which the
owner rejects: *"learn on a single potted plant and then just scale up
from there all the way to big farms, never subtracting from the
experience, only adding to it."* This build makes the plant the unit at
every scale. A field's crop is a population over **authored patches**; a
plant can be taken out of it or marked and followed exactly like a pot
plant; care verbs reach a patch by the volume the tool carries; and
reading a stand is the same skill as reading a pot, banded by
competence for players and hired hands alike. Seeded by
[field-population-slate](../slates/builds/field-population-slate.md).

## What already exists

- **The pot plant's read.** `look` gives stage, condition and a cause
  line (*"It is not getting enough light"*). The area crop already prints
  the same read, but once for the whole stand.
- **The swath.** `harvest` and `sow` already act on an area set by the
  tool (hand 2 m², sickle 40, scythe 60, a cast 400). They accept a
  field.
- **`water`** waters a pot or a plant from a can or a named holder.
  **`feed`** works compost into a bed. Neither accepts a field.
- **`sample`** takes a piece of something and notes where it came from.
  **`label`** writes your name on something.
- **The herd as a tally.** `draft` makes head *n* real, deterministically
  from the herd and the index (the same head every time), and `return`
  folds it back.
- **The reading ladder.** Every channel is open to everyone; competence
  narrows the bracket (untrained ±8% … expert ±0.5%), seeded per reader.
  The instrument caps it, and a reading names the Discipline that bands
  the by-eye read.
- **Disciplines:** `horticulture` (*"reading a dry pot, a dim corner or a
  bound root"*), `agriculture`, `soil-science`.
- **A farm-hand brain** that waters, feeds and picks through the player's
  own verbs. It works only pots and beds, reads true values instead of a
  banded read, and no NPC runs it.
- **Variation the prose already claims:** the bench's *"bare patches up
  at the top end where the soil runs out altogether"*.

Therefore what is genuinely new here is:
- the stand as a distribution over authored patches;
- a plant made real from a patch (sampled, or labeled and followed);
- `water` and `feed` reaching a patch;
- harvest grading by patch;
- a banded read of a stand that a hired hand uses too.

## Goals

- **One skill at every scale.** The read a player learned on a pot (stage,
  condition, cause) is the read they get of a plant taken from a field,
  and of each patch of a stand.
- **The stand varies where the ground varies.** A field's authored patches
  each carry their own water, nutrient and stress through the season, so
  the top end of the bench dries and starves before the rest, as its
  prose says.
- **A plant can be held.** `sample <crop> at <patch>` takes a plant out:
  a real plant you can look at (roots included), which notes where it
  came from. The same spot gives the same plant.
- **A plant can be followed.** `label <crop> at <patch>` ties your label
  to a standing plant. It stays in the field, reads like a pot plant, and
  can be tended on its own: water it and it can outgrow its patch.
- **Care reaches by what the tool carries.** `water` and `feed` aimed at
  a patch deliver the litres or kilos the vessel holds into that patch's
  soil. The effect is honest, so a bucket on a thousand square metres
  barely registers.
- **The good end gives good sacks.** `harvest <crop> at <patch>` cuts
  from that patch and mints that patch's grade.
- **Reading is competence.** How much a look at a stand or a patch says
  is banded by `horticulture`. A novice reads *"the top end looks poor"*;
  an expert reads what it lacks.
- **A hand reads with their own eyes.** One authored hand on the campus
  farm tends the home field by the same banded read, so a poor hand puts
  the water in the wrong place.

## Non-goals

- **Patches on grass** (uneven grazing, herds favoring a corner). Grazing
  stays field-wide. Destination: field-population-slate § patches on the
  sward (added by this build).
- **Weeds and pests** as something you hoe or thin. Destination:
  [farming-slate](../slates/builds/farming-slate.md) (weeds as an
  adversarial reserve).
- **Irrigation**: channels, a cart barrel, water rights. Destination:
  [irrigation-slate](../slates/builds/irrigation-slate.md). This build's
  bucket is the reason it will be wanted.
- **Seed saving or breeding from a labeled plant.** Destination:
  farming-slate (genetics and breeding).
- **Hiring your own hand** for your own ground. Destination: husbandry.md
  already names it (*"nothing lets a player hire a hand for their own
  ground"*), and the labor market's own slates.
- **Patches on beds and pots.** A bed's plants are already individuals in
  slots, and a pot is one plant. Nowhere, deliberately.
- **A grieve or steward seat with a report verb** (asking a hand what
  they saw). Destination: field-population-slate § open questions.

## Placement

- **The mechanism is the kernel's:** the plant, the stand, `look`,
  `water`, `feed`, `sample`, `label`, `harvest`. A pot and a field are
  the same model, so it cannot live in a trade.
- **The field and its patches are trade-farming's.**
- **The patches themselves are content rows on each field.** A second
  farm authors its patches with no code.
- **The hand** is campus content running farming's brain.

## Collisions

- **The Delight bench:** its prose names the bare top end. It gets three
  patches: *the top end*, *the middle*, *the lane end*.
- **The campus home field:** *the gate end*, *the middle* and *the far
  side* by the paddock. The cover drive sows and cuts it.
- **The Waponi cane pieces, the hay meadow and the other fields** author
  no patches. Each reads as one patch, exactly as today.
- **The campus farm:** the player's labourer seat is unchanged; the new
  hand is an NPC on the same farm.
- **`sample`'s existing uses** (soil and matter for instruments) must not
  change. A crop is a new kind of thing to sample.
- **`label`'s existing use** (your name on a thing) is unchanged; a
  labeled plant is a plant with your name on it.
- **The cover drive's steps** (sow, look through the season, harvest)
  keep working on a field with patches.

## Surface decisions

### Verbs — `sample` and `label`
Both already mean the act: *take a piece and note where it came from*
and *write your name on something*. No new verbs, which is lens 5: the
field answers the commands the world already has.

### Naming the patch
Every act aimed at a field with more than one patch takes *at <patch>*
(*the top end*, *the gate end*). With no patch named, the act is refused
and the refusal lists the patches. The game never picks the neediest
patch for you, because finding it is the player's job (lens 1). A field
with one patch needs no name.

### Same spot, same plant
A sampled or labeled plant's condition is its patch's, plus a seeded
variation fixed by where it stands, as with a drafted head of cattle.

### A labeled plant is a pot in the field
It follows its patch's season. Care aimed at it (a can of water, a pinch
of feed) reaches it alone, so a tended plant can outgrow its patch. That
is the lesson that tells you what the patch lacks.

### Watering and feeding a patch is volume, honestly
A patch receives what the vessel holds, spread over its area. Watering a
field by bucket is hopeless at scale, and the read says how little it
moved. Lens 1 decides it: that is why irrigation exists.

### Grade by patch
A harvest names its patch and mints that patch's grade. Without a patch
named on a multi-patch field it is refused like the others, and the
refusal lists the patches.

### Reading is `horticulture`
The stand read, the patch read and the sampled plant's read are banded
by `horticulture`, the pot skill, so the skill is literally the same one.
Detail scales with the band; nothing is withheld.

### The hand
One authored hand on the campus farm, of modest competence, tends the
home field by the banded read. Watching where they put the water against
where an expert would is the demonstration.

## Lens pass

1. **Pedagogy:** `horticulture` is dominant. Where a crop fails is
   derivable from the patch's ground and season; a sampled plant's cause
   line names it.
2. **Expression:** patches are authored rows, so every farm is
   different with no code. A player's labeled plant is theirs.
3. **3a Immersion:** the bench's *"bare patches at the top end"* stops
   being a claim the sim does not back.
   **3b Participation:** reading fields well is now a job with a
   difference between good and bad.
4. **Values:** scarce water and manure go to the patch that will pay
   back, or to the one that is failing. There is no single right answer.
5. **Continuity:** the field answers the pot's commands.
6. **Economy:** the labor of reading and carrying water, a hand's worth
   by their competence, and a better price for the good end's grain.
7. **Governance:** judges nobody; nothing to declare.

## The drive

Day-of-year matters, and staging is by clock jumps and wizard tools.

1. **The bench in summer** (crop in ear). `look` shows the stand with a
   line per patch: the top end reads poorer than the middle and the lane
   end.
2. `look wheat at the top end` gives the patch read with a cause, worded
   at the reader's band. A novice gets a vague line; a character with
   `horticulture` at expert gets the specific lack. Run both on the same
   patch at the same moment and compare.
3. `sample wheat at the top end`. The player holds *"a stem of wheat,
   from the top end of the upper bench"*. `look stem` shows stage,
   condition and cause like a pot plant, plus the roots. Sampling the
   same spot again gives a plant reading the same.
4. `sample wheat at the lane end`. The plant reads better than the top
   end's.
5. `water wheat` with no patch named is refused, and the refusal names
   the three patches.
6. **The home field after sowing.** `label wheat at the gate end` reports
   your label tied to a plant there. `look` lists it, and `look` at it
   reads like a pot plant.
7. Through a dry stretch (clock jump), the labeled plant is watered from a
   can each staged day. It reads better than its patch, and better than
   an unlabeled sample from the same patch.
8. `water wheat at the middle` from a bucket. The reply says how much
   reached the patch, and the patch read barely moves.
9. `feed wheat at the far side` with a sack of compost. The patch's
   nutrient read improves.
10. **At harvest,** `harvest wheat at the gate end` (the well-kept patch)
    and `harvest wheat at the far side` (the neglected one): the first
    patch's sack grades better than the second's.
11. **The campus hand,** over a staged dry week: the hand waters the
    home field patch their read points to, and `look` shows which.
    Compare with an expert's read of the same moment.
12. **A field with no patches** (a Waponi cane piece) reads and harvests
    exactly as before, with no patch named.
13. **A potted plant** waters and reads exactly as before.

## Acceptance criteria

1. Looking at a crop on a field with authored patches reports each patch,
   and the patch whose ground is poorer reads poorer through a season.
2. The same patch read by a novice and by an expert at the same moment
   gives the novice less detail, never a different truth.
3. `sample <crop> at <patch>` gives the player a plant that names its
   field and patch, and reads stage, condition, cause and roots like a
   pot plant. The same spot gives the same reading.
4. `label <crop> at <patch>` leaves a plant in the field with the
   player's label, which `look` lists and reads.
5. Care aimed at a labeled plant reaches only it; through a dry stretch a
   watered labeled plant reads better than its patch.
6. `water` and `feed` aimed at a patch deliver what the vessel holds into
   that patch, and say how much; the patch read moves by that much and no
   more.
7. On a field with several patches, an act with no patch named is refused
   with the patch names; on a one-patch field no name is needed.
8. A harvest from a well-kept patch mints a better grade than one from a
   neglected patch of the same field.
9. The campus hand waters the patch their own read points to, and a
   hand's read is banded like a player's.
10. Fields with no patches, beds and pots behave exactly as before.

## Cross-references

- [field-population-slate](../slates/builds/field-population-slate.md)
  (seeding)
- [cover-requirements](./cover-requirements.md) (the field, the area
  crop, the swath)
- [husbandry.md](../subsystems/husbandry.md) ·
  [soil.md](../subsystems/soil.md) ·
  [instrumentation.md](../subsystems/instrumentation.md) ·
  [ranching.md](../subsystems/ranching.md) (draft/return, the seeded
  tail)
- [farming-slate](../slates/builds/farming-slate.md) ·
  [irrigation-slate](../slates/builds/irrigation-slate.md)

---

# Addendum — tracts and fields: how a farm is laid out (2026-10-31)

**Kind:** feature · **Leads from:** content and kernel together. The first
consumers are Quist's farm at Hearts Delight (re-expressed), a row of new
farmsteads in the valley minted from the same layout, the campus farm,
the dairy, and a Hinkley Hills lot.

The owner, reviewing !480: *"if I buy a farm, does it come with the fields
already fixed? or can I carve it up into my own field content"*, and
*"we don't want every content author making up their own system for
modelling field makeup, and this should be consistent whether the content
is authored or something done at runtime like Hinkley Hills."* The
conversation that followed settled the model below. It replaces this
build's "patch" with the owner's words: **the field is what you plant.**

## What already exists

- **Parcels** are title to an extent; everything whose path sits under a
  parcel is within its perimeter. A parcel's ground is accounted: each
  building is a child parcel whose own area is its footprint.
- **Holdings** (the residence system): a holding's row carries a
  **floorplan** (rooms, names, exits) that every copy mints as its own
  keyed rooms. Hinkley Hills mints a house per lot this way. A holding's
  room set is open to rooms added at runtime.
- **`plot`** makes a 400 m² field room on ground you hold, through a hook
  the residence system offers. Every plot is the same size and one piece.
- **Zoning** (shipped): a parcel's land use, on its title, carries a
  cultivation ceiling — `residential` admits beds, `agricultural` admits
  fields. Content cannot rezone itself. Hinkley Hills is residential;
  Hearts Delight is agricultural.
- **Fields today are rooms**, eleven of them authored: the bench, the
  orchard close, the lower meadow, the hay meadow and the pasture at Hearts
  Delight; the campus home field and back paddock; the Waponi cane pieces
  and smallholdings; Rejection's goat pen. Six are hand-wired singletons.
- **Patches** (this build) are named parts of a field's soil, written
  only by an author.
- **The farm archetype** (`trade-farming`) names what a working farm
  needs: ground, water, storage, traction, groundwork, a way to market.
  Reported, never enforced.
- **The landing** (the painting build, not yet on master): a structure is
  seen and worked from the open-air place its exits lead out to.

Therefore what is genuinely new: **the tract** (an authored, walkable
piece of a parcel's open ground, sized as a share), **fields marked by the
player** inside a tract where zoning admits fields, **farms as holdings
with a farm layout** that can be copied (and mirrored) onto any parcel,
and a tract seen from the places that lead into it.

## Goals

- **A farm is laid out one way, everywhere.** Authored or made at runtime,
  a farm is a holding on a parcel: its buildings, and one or more tracts.
  No author invents their own scheme.
- **A tract is a place you walk to, and it is always authored.** Its name,
  its exits and its share of the open ground come from the layout; its
  soil comes from where that copy actually is. No verb makes a tract.
- **Every holding with open ground has a tract**, a Hinkley house lot as
  much as a farm: the mechanics are the same everywhere, and **zoning**
  decides what the tract may carry.
- **The field is what you plant, and the holder draws it.** Standing on a
  tract, the holder marks fields on it (a name and a share), resizes them,
  and removes them. Fields don't divide further.
- **A farm layout can be copied.** The same layout minted on many parcels
  gives each its own tracts with the same names, sized to that parcel and
  grown on that parcel's ground; a layout may be mirrored.
- **A tract is seen from where it is reached.** From the farmyard you can
  look at the upper bench and read its fields, then walk up to work it.
- **Grazing and grass belong to the field.** A herd grazes a field; a
  pasture is a field of grass.
- **The farm archetype can ask for fields.** "This is a farm" can be
  queried for its tracts and fields; a farm of beds or pots is still a farm.

## Non-goals

- **Deriving rooms or paths from carving.** Tracts are authored rooms (or
  added whole at runtime); fields are never rooms. Nowhere, deliberately.
- **Fences, hedges and gates between fields as objects.** A field's
  boundary is its marking; grazing respects it. → the field-population
  slate (§ 8 already holds enclosure).
- **Weeds and volunteers.** → `seed-and-propagation-slate.md`.
- **The farm hand moving the barn's stock to the shelf.** →
  `seed-and-propagation-slate.md`.
- **Operating scale within agricultural ground** (smallholding · estate ·
  plantation: classes a locality writes, measured by the engine, judged
  by an officer, never a silent cap). → `land-use-covenant-slate.md`
  § the operating-scale term (MR !494), civics' to build. It sits on top
  of these mechanics without changing them.
- **Selling farmsteads beyond the one valley row this build stands up**
  (a land office, a farm market). → `settlement-model.md`'s land markets.

## Placement

- **The farming trade** owns tracts, fields, the farm layout and the
  verbs. **The residence system** owns holdings and floorplans. Its untyped
  hook for another trade to add a room to a holding retires with `plot`.
- **A second farm needs no code:** a layout row and a parcel.
- **Hearts Delight** owns Quist's farm and its new farmsteads; the
  **campus**, **Waponi** and **Rejection** keep their places, re-expressed.

## Collisions

- **Every authored field place changes kind** (eleven, above): each
  becomes a tract, and its patches or its single crop become fields.
- **Quist's farm has no parcel of its own** except the orchard close: it
  gains one covering the farmstead, the bench, the close and the lower
  meadow.
- **The dairy** keeps its parcel; the pasture and hay meadow become its
  tracts.
- **The campus farm**: the home field and back paddock become its tracts;
  the college herd grazes a field on one of them.
- **Hinkley Hills lots**: the house floorplan gains a garden tract; `plot`
  and its fixed 400 m² field room retire. Zoned residential, the garden
  takes beds, not fields.
- **The cover and field-population drives** name patches; they are
  reworded to fields. Their acts don't change.
- **The painting build's landing**: the tract's must be the same rule,
  whichever merges first.

## Surface decisions

### The words

**Parcel** (title, area) · **farm** (a holding on a parcel) · **tract**
(a walkable piece of its open ground) · **field** (what you plant, marked
on a tract). "Patch" retires.

### A tract's size is a share

A layout gives each tract a share of the holding's open ground (the
parcel's ground less what its buildings stand on), never square metres,
so one layout fits any parcel.

### Fields start empty

A new copy of a layout has tracts and no fields: every choice is the
holder's. An author may pre-mark fields where the place is already being
farmed when a player arrives (Quist's bench, the dairy's pasture, the
campus fields) — a starting state the holder may re-mark. Lens 2 chose.

### Tracts are authored; `mark` makes a field

- **No verb makes a tract.** `plot` retires: its one job (farmland on
  ground you hold) now comes with the layout.
- **`mark <name> [as <share> of it]`** — standing on a tract you hold (or
  work for its holder), mark, resize or name a field. Its soil is the
  ground where it lies.
- **Removing a field** returns its ground to the rest of the tract.
- **Zoning gates `mark`.** A field needs ground zoned for field-scale
  cultivation (agricultural); on residential ground the refusal names the
  zoning, and the tract takes beds instead. The shipped gate, applied to
  the new verb — the same everywhere.
- **A field with a crop standing can't be resized or removed** until it is
  cut or grubbed — you can't move a boundary through standing wheat
  (lens 3a chose).
- Survey (`analyze soil`, `measure …`) works on a tract before any field
  exists, and `at <field>` once one does.

### A tract is seen from where you reach it

The places whose exits lead into a tract can `look` at it: its fields in
one line each, as the field read does today. You work a field only from
its tract. The rule is the painting build's landing, applied to a piece
of ground rather than a building.

### Copies and mirroring

A farm layout is minted per parcel like a Hinkley house: same names,
its own rooms. A layout may be marked **mirrored** for a copy, flipping
its compass (east ↔ west), so a row of farmsteads doesn't all face one way.

### The farm archetype

Its ground slot is satisfied by a tract with at least one field — or, as
before, by cultivated beds. Still reported, never enforced.

### What stands up in the world

- **Quist's farm** becomes a copy of a farm layout on its own parcel: the
  farmstead, barn and byre; tracts the upper bench (its three fields
  pre-marked: the top end, the middle, the lane end), the orchard close
  and the lower meadow.
- **Four farmsteads in the valley**, minted from the same layout and
  alternately mirrored, empty of fields, buyable with `title buy` like a
  Hinkley lot.
- **The dairy**, **the campus farm**, **Waponi's pieces** and
  **Rejection's goat pen** re-expressed as tracts with their current
  working fields pre-marked.

## Lens pass

1. **Pedagogy.** Laying out a farm is the lesson: survey first, mark where
   the ground changes, keep enough fields to rotate (the yield work makes
   rotation pay), keep stock off the crop. All of it derivable from the
   ground the player reads.
2. **Creative expression.** A farm layout is rows only; a second farm is a
   copy; the holder owns the field layout. The author writes the starting
   state, never the final one.
3. **3a Immersion:** tracts are real places you walk up to. **3b
   Participation:** a valley of empty farmsteads is a farm-shaped hole.
4. **Values.** Nothing decided for the player: how to divide is theirs.
   What scale the ground may carry is zoning's (shipped) and, within
   agricultural ground, the polity's (the covenant slate).
5. **Continuity.** The same verbs at any epoch; a drill or a tractor
   changes how much a field costs to work, not how fields are made.
6. **Economy.** Farmsteads are land to buy; a farm's fields set what it
   can grow, graze and rotate.
7. **Governance.** Only the holder (or a hand on shift) marks a field;
   title is the shipped parcel rule.

## The drive (blocking, staged where it needs a season)

1. A fresh character with funds buys a valley farmstead (`title buy`),
   walks in, and finds its tracts named in the yard's exits.
2. From the farmyard, `look upper bench` reads the tract: rough ground, no
   fields yet.
3. Walk up to the bench; `analyze soil` reads the tract before any field.
4. `mark barley field as a third of it` — the reply names the field and
   its share; `look` lists it.
5. `mark wheat field as two-thirds of it`; a third `mark` past the whole
   is refused, naming what is left.
6. Sow the barley field with threshed grain; `mark barley field as half
   of it` is refused while the crop stands.
7. A second farmstead (mirrored) has its tracts on the opposite compass
   point; its upper bench's soil reads differently from the first.
8. At Quist's farm, the bench reads its three pre-marked fields exactly as
   the field-population drive's bench steps do.
9. On a Hinkley Hills lot, the garden tract is there to walk into;
   `mark wheat field` is refused, naming the residential zoning; a bed set
   in the garden takes a planting as before.
10. The dairy herd grazes the pasture field; a field with a crop on the
    same tract is not grazed.
11. The farm archetype reports Quist's farm and a fresh farmstead: both
    farms, and the fresh one lists tracts with no fields.

## Acceptance criteria

- Every farm in the world is a holding on a parcel, laid out the same way;
  no field is a room.
- A farmstead layout copied onto two parcels gives two farms with the same
  tract names, different sizes in proportion, different soil, and (when
  mirrored) the opposite compass.
- A player who holds a farm marks, resizes and removes fields on its
  tracts by player verbs, and is refused moving a boundary through a
  standing crop.
- The same verb on a Hinkley lot's garden is refused by its zoning, in the
  zoning's own words; beds still work there.
- No verb makes a tract; every tract in the world comes from a layout.
- From a place that leads into a tract, a player can read the tract's
  fields without entering it; fields are worked only from their tract.
- Herds graze a field, not a place.
- The cover and field-population drives pass, reworded to fields.
