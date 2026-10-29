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
- **The campus home field:** *by the gate*, *the middle* and *the far
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
