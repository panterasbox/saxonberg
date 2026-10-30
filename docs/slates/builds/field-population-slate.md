# Field population slate — the plant is the unit at every scale

> **Status: PARTIAL** — designed 2026-10-29 with the owner, during the
> cover build's review (MR !480), and built on that MR (plan
> `field-population-plan.md`, W0–W6): authored patches as soil parts, the
> sampled stem and the labeled plant with its root zone, `water`/`feed`/
> `sow`/`harvest` at a patch, the banded read, grading by patch, and the
> campus hand who reads with her own eyes.
> **Left:** weed/thin (a hoe; `Patch` is where a weed reserve would live)
> · patches on the sward (§ 9) · the grieve's report (§ 8.5) · the hand
> harvesting a field · seed saved from a labeled plant · a second arg on
> `look` (the command-taxonomy slate)
> **Size:** a small build

**Sits on:** [husbandry.md](../../subsystems/husbandry.md) (the plant,
the pot as a bed with one slot) · [soil.md](../../subsystems/soil.md)
(the field, ground character) · [ranching.md](../../subsystems/ranching.md)
(the tally, `draft`/`return`, the seeded tail) ·
[instrumentation.md](../../subsystems/instrumentation.md) (competence
resolves detail, never access) · the cover build (area crops, the swath).

---

## 0. The thesis

The owner, on the cover build as shipped:

> *"I kinda wish that even at field scales you were forced to deal with
> individual plants in some way… I just dont like the idea of 'big
> farming' and 'small farming' being really two different skills in the
> game. and I mean skill here like literally player skill… I would want
> you to learn on a single potted plant and then just scale up from there
> all the way to big farms but never subtracting from the experience only
> adding to it."*

> **The plant is the unit at every scale. The tool decides how many
> plants one act reaches. Scaling up only ever adds reach and adds
> people; it never removes the plant.**

husbandry.md's founding shape already says this, since a pot is a bed
with one slot (N = 1 of the same thing). The cover build's area crop broke
it: at field scale the plant became a number with a stage, and the field
answered `look` but not `water`, not a close inspection, not the reading
a player learned on a windowsill. Lens 5's test is whether the new object
answers the same commands, and the field failed it. This slate restores
it.

## 1. What already exists

- **The pot plant's read:** stage, condition band and a live *cause* line
  (*"It is not getting enough light"*, *"It is soaked through"*). The
  area crop already prints the same read for the whole stand.
- **The swath:** `harvest` and `sow` act on an area set by the tool
  (bare hand 2 m², sickle 40, scythe 60, a cast 400). The rule is
  shipped; only two verbs use it.
- **The herd as a tally:** `draft` cuts a head out of a herd into a real
  object whose condition is the record plus a **seeded** per-head
  variation (the same thin heads every time), and `return` writes it
  back. A population held as a record, with individuals made real on
  demand, is shipped and works.
- **The reading ladder:** competence resolves *detail*, never *access*;
  a seeded bracket; the instrument's ceiling.
- **Care verbs for a pot:** `water` (a plant or a pot, with a can) and
  `feed` (compost worked into a bed).
- **The content already describes variation the sim does not model:**
  the bench has *"bare patches up at the top end where the soil runs out
  altogether"*.

Therefore what is genuinely new is: the stand as a **distribution over
authored patches**, plants made real **from** that distribution, care
verbs that **reach** like the swath, and a competence-tied reading of a
stand.

## 2. The stand is a population over authored patches

- A field's ground is divided into **patches** a row authors, such as
  *the top end*, *the wet corner* or *by the gate*. Each is a share of
  the field with its own lean on the ground's character (thinner,
  wetter, sourer, sheltered). A field with no patches authored is one
  patch, which is today's behavior.
- **The crop's condition is per patch.** Each patch integrates its own
  water, nutrient and stress over the same season, so a dry spell bites
  the top end first and the wet corner last. The stand's stage and
  grade are what its patches make up.
- **Within a patch, plants vary by a seeded tail**, as the herd's heads
  do: deterministic by position, so the same weak plants are weak every
  time you look.

## 3. Individuals, made real on demand

- **A plant picked out of the stand** (*"a stem from the top end"*) is a
  real plant object, derived from its patch's state plus its seeded
  variation. Every pot verb works on it. Taking it is destructive, a
  sacrificial sample (you see the roots), exactly as a grower pulls a
  stem to look.
- **A marked plant** stays an individual you follow through the season,
  like a potted one. It is one object, not thousands, and its patch's
  care reaches it.
- No per-plant storage. Like the herd, the record is the patch, and the
  individual is derived.

## 4. Care verbs reach by tool

The same verb at every scale; the tool sets the reach:

| act | a pot | a bed | a field |
|---|---|---|---|
| `look` | the plant | each plant | the stand by patch, and any plant picked out |
| `water` | a cup | a can over a few plants | buckets to a patch, and later a channel |
| `feed` | a pinch | a trowel of compost | a barrow or cart over a patch |
| weeding or thinning | by hand | a hoe along a row | a harrow over the field |
| `harvest` | pick one | cut a row | a swath per act (shipped) |

A field-scale act is the pot act with a bigger reach, aimed at a patch.

## 5. Reading a stand is a competence

- **Walking a field and reading it** reports the stand by patch: which
  patch is behind and why. **Competence decides detail, never access**
  (the instrument rule). A novice sees *"the top end looks poor"*; a
  practiced grower sees *"the top end is starving for nitrogen and
  starting to dry"*.
- **A hired hand reads with their own competence**, so employing a good
  grieve is a real decision at scale: their report is as good as they
  are.

## 6. Grading follows the patches

The crop's grade already comes from its worst stretch. Per patch, the
grade a swath mints is **its patch's**: cut the good end first and the
first sacks are the best. Weakest-link survives, but the weakest link is
now a place you can find and fix.

## 7. Lens pass

- **1 pedagogy:** the reading skill is the lesson, and it is the same
  skill from a windowsill to an estate. Where a crop fails is derivable
  from the patch's ground and season.
- **2 creative expression:** a field's patches are rows; a second farm
  is authored with no code.
- **3a immersion:** the prose's *"bare patches at the top end"* stops
  being a lie the sim does not back.
- **3b participation:** a grieve who reads fields well is a job the
  economy now has a hole for.
- **4 values:** where to spend scarce water and manure, on the patch that
  will pay back or the one that is failing, has no single right answer.
- **5 continuity:** the field answers the pot's commands.
- **6 economy:** labor goes where the reading sends it; good readers earn.

## 8. Open questions (for requirements)

1. **The verbs.** Picking a plant out and marking one want verbs; `draft`
   is the herd's, `sample` is instrumentation's (*take a piece and note
   where it came from*), and `stake`/`mark` belong to mining and ice. The
   collision ladder decides.
2. **Weeding and thinning:** a verb of their own, or `feed`-shaped care
   on the patch? And is a weed a thing the sim models, or a stress term?
3. **How many patches** a field may author, and whether an authored field
   with none is one patch or gets seeded defaults.
4. **Does a marked plant outlive the crop** (a seed plant kept for next
   year's seed)?
5. ⭐ **A grieve's report** (agreed 2026-10-29, for later): a hand or
   steward seat a player can ask what they saw across the farm, with the
   report banded by the hand's competence. The cover-build hand only
   *acts* on its read.

## 9. Patches on the sward (later)

The field-population build gives **crops** patches; grass stays
field-wide. Later, the sward could vary by patch too: herds favor the
sheltered corner and poach the wet one, and a field grazes unevenly.
That reaches the grazing ledger, the trough draw and herd condition, so
it is its own build.

