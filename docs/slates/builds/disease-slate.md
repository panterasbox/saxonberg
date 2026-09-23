# Disease slate — infection, transmission, and the price of density

> **Status: PARTIAL** — the logistic growth term and the two-population
> split shipped as spoilage (`FreshnessMixin` / `ContaminableMixin`) →
> [spoilage.md](../../subsystems/spoilage.md)
> **Left:** `ContagionSpec` (routes · host range over `Clade` · reservoir)
> — `Condition.contagion` is still `null` with no consumer · the
> between-room push tick + the per-room contaminant map · care-is-immunity
> across every host (the husbandry coupling, and the room-condition /
> hygiene half, both unbuilt) · quarantine (promote `openNeighboursOf`) ·
> the outbreak investigation · the four un-misery rules · the per-object
> work table (absorbed Part 1) · the epidemiology pedagogy + wrong-about
> hooks (absorbed Part 5) · the thin medic vertical / `resolution.by`
> dispatcher (open Q3) · the crops-first v1 slice
> **Size:** a build

See also — **the vertical this engine serves**:
[health-vertical-slate](./health-vertical-slate.md) (clinical practice, public
health, the College of Physic, and the teaching seam — the *pedagogical* payoff
of everything below).
Consumers: [farming](../tails/farming-slate.md) (blight; rotation's *true* reason) · [ranching](./ranching-slate.md) (**where this question started** —
herd disease was its "biggest open call") · [pets](./pets-slate.md) (the
individual case; the zoonotic bridge) · [fishing](../tails/fishing-slate.md)
(aquaculture; its *Water composition* section already routes contamination
through `Condition.toxinBehavior`) · [stewardship](./stewardship-slate.md)
(density is zoned). Substrates: [harm.md](../../subsystems/harm.md) ·
[metabolism.md](../../subsystems/metabolism.md) (**the burden engine**) ·
[vitals.md](../../subsystems/vitals.md) · [biome.md](../../subsystems/biome.md)
(atmosphere + the contaminant column) ·
[respiration.md](../../subsystems/respiration.md) ·
[fire.md](../../subsystems/fire.md) (**the propagation shape to copy**) ·
[race.md](../../subsystems/race.md) (`Clade` — where host range lives) ·
[bulk.md](../../subsystems/bulk.md) ·
[advancement.md](../../subsystems/advancement.md). Prior design:
[vitals-slate](../tails/vitals-slate.md) (the Kind A/Kind B split, and where
`ContagionSpec` was first reserved).
*Absorbed from disease-design-pack's See-also:*
[room-condition](./room-condition-design-pack.md) + husbandry (**"care is
immunity"** across hosts).

---

## The seam is already cut

A shipped seed, `seeds/lib/metabolism/conditions/ptomaine.yaml`:

```yaml
class: /platform/idea/Condition
data:
  name: food-poisoning
  resolution: { by: antitoxin }
  observableSigns: [nauseous, cramping, sweating]
  contagion: null              # ← already on the schema, null in all 11 seeds
  toxinBehavior:
    toxinType: ptomaine
    absorptionRate: 4          # pool → burden, per game-minute
    clearanceRate: 0.02        # burden decay, per game-minute
    potency: 1
    bands: [{threshold: 2, severity: 1}, {threshold: 6, severity: 2}, …]
```

`ContagionSpec` is **declared, authored `null` everywhere, and has zero
consumers** — a reserved seam exactly like combat's pet rung on `sideOf`. And
[vitals-slate](../tails/vitals-slate.md) already settled the taxonomy it sits
in:

- **Kind A — afflictions** (disease, poison, toxin, infection): authored,
  identity-bearing `Idea` templates under `/lib/condition/…`, referenced by
  `templatePath` from an `AfflictionRecord` on the host.
- **Kind B — trauma**: parameterized damage, closed vocabulary, sited.

**Disease is Kind A, and Kind A is content.** A new disease is a data row.

## Absorbed from disease-design-pack — Part 0 — What it is, and why it's the capstone

**A within-host microbial load that *grows* (like spoilage) and *spreads*
(between hosts), gated by the host's care-derived resistance; past a threshold
it drives afflictions and death.** It is the pillar's capstone because it is
where the producers **connect**: spoilage's growth curve, room-condition's
hygiene, husbandry's care-score, and the family's density dials all feed it.

> ⭐ **The seam is already cut** (disease-slate): `ContagionSpec` is declared,
> `null` in all 11 condition seeds, **zero consumers**; `toxinBehavior` is a
> *complete* within-host burden engine. A whole disease system is **two deltas**:
> **one growth term** (spoilage builds it) + **one filled-in `ContagionSpec`**.

---

## The core model — a burden that grows **[DECIDED]**

*(Shipped, in a different shape: the growing load is `pathogenLoad` on
the `AfflictionRecord`, advanced under a declared `progression.law:
logistic` by `VitalsMixin.reconcileConditions` — a sibling of a wound, not
an extension of `ToxinBehavior` → [spoilage.md](../../subsystems/spoilage.md)
§ In the body, [vitals.md](../../subsystems/vitals.md). Incubation is the
load below the lowest band, exactly as this section predicted.)*

---

## Two idioms, not one **[DECIDED]**

The most important architectural call here, and the one most likely to be got
wrong:

| Half | Idiom | Why |
|---|---|---|
| **Within-host load** | **reconcile-on-read** — the ninth host on a well-documented shared pattern | the host is read constantly; lazy integration is free |
| **Between-room spread** | **a push tick over rooms** — `FireLogic.advanceFireInRoom`'s shape | **nobody reads an empty room** |

Reconcile-on-read cannot carry spread. Fire is the engine's only spatial
propagation driver precisely because propagation must happen where no one is
looking. Its shape is the one to copy: **one hop, attenuated, gated by the exit
graph.**

**The within-host half inherits a mature discipline** (from metabolism, copied
verbatim by seven other mixins): a persisted game-time stamp, first-touch seed,
linkdead re-stamp, an `elapsed <= 0` guard, and a reentrancy flag. ⚠ **Not the
4-hour far-past guard** — that is bodies-only; a herd inheriting it could
not get sick across a logout. See [ranching § The clock](./ranching-slate.md).

---

## `ContagionSpec` — the one thing to design

```
ContagionSpec {
  routes[]           // how it moves
  infectivity        // per-exposure transfer
  infectiousWindow   // when the host can transmit — often BEFORE symptoms
  hostRange          // WHO can catch it  ← the cross-species answer
  reservoir          // where it persists between hosts
}
```

### Routes — and what each already has

| Route | Existing hook | State |
|---|---|---|
| **contact** | co-location / containment | trivial |
| **airborne** | room `_atmosphere` → `BiomeApi.contaminantOf` → `Respiration.applyMediumContaminant` → `addToxinBurden` | ⭐ **a complete shipped env→body loop** (`smoke → carbonMonoxide`) |
| **waterborne** | `BulkPayload.toxicity[]` is **already an open, arbitrarily-keyed solute list** | no schema change |
| **foodborne** | `ingest` → `routeIntake`; `tox.type` is an arbitrary string, unknown tags are a silent no-op | ⭐ **works today, zero plumbing** |
| **vector** | a mobile carrier — falls out of contact + mobility | free |
| **fomite** | an object carrying a load — chattel + containment | cheap |
| **vertical** | `SpawnerMixin`'s parent→child edge (the only one in the engine) | a hook site; the set is transient |

*Absorbed from disease-design-pack § Part 2 (the fomite route):* **a dirty hand from room-condition is a fomite**.

> **Airborne is the surprise.** The whole path from "this room is contaminated"
> to "a banded condition on the body that breathed it" is **shipped and
> working** for smoke. An airborne pathogen is structurally identical, with a
> growth term and a *sick body* as the source instead of a fire.
>
> **One caveat:** `_atmosphere` is a **single string tag**, so a room is
> `'smoke'` or `'air'`, never "air + influenza". Airborne disease needs a
> parallel per-room contaminant map (or a room-scoped burden — `airReserveOf`
> is the precedent for room-scoped scalar state).

### Host range — the cross-species answer **[DECIDED]**

Express it over the **existing `Clade` tree** (`animalia`, `plantae`, `fungi`,
`constructa`). That gives species-specific, genus-wide, clade-wide, and
cross-clade for free, with no new taxonomy.

> **Default containment, deliberate crossing.** A crop blight stays in crops. A
> herd disease stays in cattle. But a **zoonosis crosses** — and the moment one
> does, ranching stops being a private business problem and becomes a **public
> health** problem.

This is what keeps the systems separable by default while letting a *few*
authored diseases connect the whole world. Most content should be contained;
crossing should be rare, deliberate, and a big deal.

**Nothing carries host range today** — no field on `Species` or `BodyPlan`. The
gap is already named in [mixin-slate](../tails/mixin-slate.md): *"`Poisoned`,
`Diseased` — pathogens and toxins have host ranges."* `BodyPlan.breathableMedia`
is the closest shipped precedent for "which species does this environmental
thing apply to" — copy that shape.

### Reservoir — what makes disease non-ambient

A pathogen must persist *somewhere* between hosts: a wild population,
contaminated soil, standing water, a carrier. **The reservoir is what makes rule
one below enforceable** — and what makes an outbreak traceable.

---

## Immunity is live — good husbandry *is* immunity **[DECIDED]**

`Resists.stageFor(residual, bands, factor)` — and **`factor` divides the
residual before banding.** That is the per-host susceptibility parameter, and
its one live instance reads **off current host state, not an authored
constant**: a drained, frayed mage resists fear worse than a rested one.

Point that at disease:

> ### Good husbandry *is* immunity.
> A well-fed, warm, unstressed animal resists. A neglected one succumbs. **The
> condition score the husbandry family already computes becomes the resistance
> factor.**

This is the keystone of the whole design, because it means:

- **Disease is the consequence of care quality**, not a dice roll — the deepest
  possible form of the never-ambient rule.
- **Density and care multiply.** Crowded *and* well-kept is survivable; crowded
  *and* neglected is an outbreak. Two dials the player already controls.
- It closes the loop with [ranching § One care model, three
  outputs](./ranching-slate.md): care already produced yield, `Grade`, and bond.
  Now it also produces **resistance** — the same input, a fourth output.

Cheap, too: `'toxin'` is already a declared `RESIST_AXIS`, so the axis list
barely moves.

### Absorbed from disease-design-pack — Part 3 — 1. Care is immunity, pointed at every host

**1. Care is immunity — pointed at *every* host.** disease-slate's keystone:
`Resists.factor` reads **live off host state**, so the care-derived condition
score *is* the resistance term — disease is the **consequence of care, not a
dice roll**. We have now built that condition score for **four hosts**: the
**herd** (husbandry), the **crop** (soil), the **body** (hygiene — room
condition's `Soilable`), and the **home** (room condition). **One resistance
model, every host** — a well-fed animal, a rotated field, clean hands, a tidy
home are the *same* immunity seam. Good stewardship *is* not getting sick.

---

## The unifying frame

> ### Disease is the shadow of the density dial.

Every scaling decision this family makes increases transmission — crop coverage
and monoculture, stocking rate, **paddock concentration** (concentrating animals
is the *point* of rotational grazing), pond stocking, the companion ceiling,
urban population.

**Disease is the price of concentration, and it is the same price everywhere.**
That makes it the counterweight the family currently lacks: as designed, every
density dial points one way — toward more.

---

## How it plugs into each system

| System | Density is | The disease | The practice that prevents it |
|---|---|---|---|
| **Farming** | coverage / monoculture | blight | **rotation** — and this is rotation's *true* historical reason; farming has it only for nutrients today. Resistance is a genome trait the slate already names as a Mendelian marker |
| **Ranching** | stocking rate, paddock concentration | herd disease as **prevalence** at the aggregate density | quarantine, biosecurity, culling — the direct counterweight to subdividing for utilization |
| **Aquaculture** | pond stocking | waterborne, in a genuinely shared medium | water exchange, density limits; wild↔farmed exchange is a live real-world issue |
| **Pets** | the companion ceiling | the individual case — your dog is sick | care, and **the zoonotic bridge to you** |
| **Players / NPCs** | city density | the highest stakes | diagnosis + cure (largely unbuilt — see below); NPC populations are the **reservoir** that makes a city epidemic possible at all |

### Farming gets the most out of it

Rotation currently exists in the farming design **only for nutrients**. Disease
gives it its second and historically truer reason — breaking the pathogen cycle
in the soil. Two independent reasons to do the same real practice is exactly the
"player derives it from principles" property.

### Ranching gets its missing counterweight

The paddock-granularity design trades utilization against attention with no
downside to concentration. Disease supplies it: **subdividing concentrates
animals, and concentration is transmission.** That makes stocking rate a genuine
three-sided decision.

---

## The clock does something lovely here

Your **own** disease reconciles on **played** time (the avatar still
presence-freezes). Your **herd's** reconciles on **world** time, because owned
things do.

> **You never log in sicker than you logged off — but you can log in to a sick
> herd.**

That falls straight out of the family clock convention with no special case, and
it is exactly the right fairness split: the thing you can delegate care for runs
while you're away; the thing you cannot does not.

---

## Four rules to keep it from being miserable

Ranching flagged disease as *"the most pedagogically interesting mechanic here
and the one most likely to make a cozy loop feel punishing."* These are the
answer.

1. **Never ambient.** Disease must have a **source** — a reservoir, an
   introduction, a contact. A careful, isolated operation is genuinely safe;
   risk arrives with **trade, movement, crowding, and contact with the wild.**
   This converts disease from a random tax into a consequence of choices. (And
   the live-immunity term above makes it a consequence of care as well.)
2. **Legible before lethal.** `observableSigns` ships. Incubation → visible
   signs → acute gives a window, and **noticing is the skill** — `assess` plus
   the `medicine` Discipline.
3. **Prevention is practice, not purchase.** Rotation, spacing, quarantine,
   sanitation, culling. All teachable; all of it is what husbandry *is*.
4. **Forgiveness holds.** It costs; it does not delete — outside explicitly
   raised stakes.

### A free quarantine mechanic

`openNeighboursOf` (the ventilation/adjacency primitive) already skips an exit
whose door is sealed and shut. Its own comment: **"a closed or locked door is a
firebreak."** Identical semantics for contagion — **a closed door is a
quarantine barrier**, with nothing to build.

*Build note:* it is a module-private function inside `FireLogic.ts` and would be
copied a third time. **Promote it** rather than duplicating.

### An outbreak is an investigation

Because transmission has routes and contact is recordable, **an outbreak has a
source you can find.** Patient zero is discoverable — which makes an epidemic a
*mystery* rather than a debuff, and feeds the
[inquiry](./inquiry-slate.md) vein.

---

## Substrate audit (verified 2026-07-31)

*(Superseded by the code: the growth term shipped; `treat` now sees
afflictions (`TreatController.ts`); harm.md itself records the
`ConditionApi` correction this audit filed. Still true today:
`ContagionSpec` has zero consumers, `openNeighboursOf` is module-private
in `FireLogic.ts`, and nothing carries host range.)*

---

## Where to prove it — crops first

**Not cattle, and definitely not pets.** Plants are the right first host:

- **Simplest host** — no vitals stack, no consciousness, no death choreography.
- **Lowest stakes** — losing a crop costs a season; losing a bonded animal costs
  a friend. Disease should earn trust before it touches anything you love.
- **Density is already a dial** (coverage), and **rotation already exists**,
  gaining its truer meaning.
- **Resistance is already named** in the genetics design as a Mendelian marker
  trait.
- **The pedagogy is real** — plant epidemiology is a genuine field running the
  same math.

Then **ranching** (prevalence, quarantine, the stocking-rate tension), then
**pets and players** last — the emotional and zoonotic tier, where stakes are
highest.

### The v1 slice

One affliction with contagion · **one route** (contact or airborne) · host range
on one species · reconcile-on-read load with the growth term ·
`observableSigns` → `assess` · one prevention practice · one resolution.

---

## Absorbed from disease-design-pack — Part 1 — Designed to the per-object format

**1. What it is.** Above — a `Kind A` affliction (authored `Condition` Idea)
carrying a `PathogenBehavior` (a growing `toxinBehavior`) + a `ContagionSpec`.

**2. Composition.** No new host mixin — it rides the **shipped** vitals
`Condition`/`AfflictionRecord` + toxin-burden engine on any living host
(`Creature`/plant/herd). A disease is **content** (a data row), not a class.

**3. New / updated mixins & surfaces.**

| | Work | State |
|---|---|---|
| ✳ **Growth term on `ToxinBehavior`** | add `growth`/`K` fields → `dLoad/dt = growth·load·(1−load/K)·f(resist) − clearance`; toxin becomes a strict subset | **extend (shared with spoilage)** |
| ⭐ **`ContagionSpec` filled in** | routes, infectivity, infectiousWindow, hostRange, reservoir (Part 3) | **new data + one consumer** |
| ⭐ **Between-host spread driver** | a **push-tick over rooms** copying `FireLogic`'s one-hop attenuated neighbour walk (reconcile-on-read can't carry spread) | **new (promote `openNeighboursOf`)** |
| ✳ **`Resists.factor` ← host condition** | the care-derived condition score becomes the live susceptibility term (Part 4) | **wire (shape ships)** |
| ✳ **Per-room contaminant map** | `_atmosphere` is a single tag today; airborne disease needs a parallel `_contaminants: Record<string,number>` (the `airReserveOf` precedent) | **new (room-scoped state)** |

*(The pack's "two idioms, not one" paragraph stood here — a duplicate of
[§ Two idioms, not one](#two-idioms-not-one-decided) and
[§ The clock does something lovely here](#the-clock-does-something-lovely-here).)*

**4. Verbs & affordances.** `assess` (read `observableSigns` — noticing is the
skill, gated by the `medicine` Discipline); quarantine is **free** (a closed
door is already a firebreak → a contagion barrier, `openNeighboursOf`); the
medic's `treat`/cure is the thin vertical (Part 7). No new core verb.

**5. Persisted fields.** The load scalar + clock stamp on the `AfflictionRecord`
(shipped shape); the room contaminant map. Bands/stage derive.

**6. Seams & dependencies.** **Requires the growth term (spoilage) + Condition
substrate live** (doctrine Part 6). Then incubation → acute → recovery → death
fall out of the load crossing bands, **all shipped**.

**7. Fault line.** Build **after** spoilage (inherits its growth term) and
room-condition (the hygiene route). The *within-host* half is near-term once
spoilage lands; the *spread* half is the genuinely new driver.

---

## Absorbed from disease-design-pack — Part 5 — Pedagogy: the public-health capstone

Spoilage taught the growth curve; room-condition taught the chain of infection;
**disease puts them together into epidemiology** — the real science, honestly:

- **The SIR/logistic dynamics** — the same growth curve, now with **transmission**
  and an **R₀** (per-exposure transfer × contacts); **herd immunity** falls out
  of the resistance distribution across a population.
- **The density–transmission law** — *why* concentration is risky, rendered as
  mechanism rather than asserted.
- **Contact tracing** — an outbreak with routes is a solvable case (patient zero).
- **Prevention as practice** — quarantine, rotation, sanitation, culling as the
  levers, each with a real historical reason.

**Wrong-about / hooks** (keys computed by the sim): *"Herd of N at stocking rate
S, care-score C — outbreak or not?"* (density × immunity); *"A sealed door between
rooms — does it spread?"* (the firebreak); *"Given these contacts and windows,
who is patient zero?"* (tracing). Real epidemiology problems with computed keys —
and the clinical layer is the [health-vertical](./health-vertical-slate.md).

---

## Absorbed from disease-design-pack — Part 6 — Interop (the connective tissue)

- **Spoilage** — literally the same growth term; build there first, disease
  inherits the within-host engine working. (Spoilage = disease minus transmission.)
- **Room condition / hygiene** — the foodborne/contact/fomite routes (dirty
  hands, dirty surfaces) + the home-immunity term. The two packs interlock at
  the chain of infection.
- **Husbandry / soil / ranching / farming** — the care→immunity term for herds
  and crops; disease is the density dials' counterweight (stocking rate,
  monoculture, rotation's *true* reason).
- **Metabolism / vitals** — the shipped burden engine, bands→stage, the
  vomit/antidote loop; the `heartRate`/death seams. Gated on **Condition-live**.
- **Biome / respiration** — the airborne env→body loop (shipped for smoke),
  needing the per-room contaminant map.
- **Fire** — the propagation *shape* to copy (and `openNeighboursOf` to promote).
- **Belief / chronicle** — an outbreak's investigation records; a survivor's
  immunity as identity memory.

---

## Absorbed from disease-design-pack — Part 7 — Forks settled

1. ~~Growth term → extend `ToxinBehavior`~~ — **superseded by the code**: the
   load is `pathogenLoad` on the `AfflictionRecord` under a declared
   `progression.law: logistic`, not on `ToxinBehavior` →
   [spoilage.md](../../subsystems/spoilage.md) § In the body.
2. **Spread → a push-tick over rooms** (Fire's one-hop attenuated walk); promote
   `openNeighboursOf` rather than copying it a third time.
3. **Airborne → a per-room contaminant map** (`_contaminants`), the `airReserveOf`
   precedent — because `_atmosphere` is a single tag.
4. **Host range → the `Clade` tree**; default containment, authored crossing.
5. **Immunity → `Resists.factor` ← the live host condition score** (four hosts,
   one seam). Never a flat authored constant.
6. **First proof → crops** (simplest host, lowest stakes — losing a season, not a
   friend), *after* the machinery is proven on a **fish** in spoilage. Then
   ranching (prevalence, quarantine), then pets/players (the zoonotic tier) last.

---

## Open questions

- **Where the growth term lives** — extend `ToxinBehavior` with optional growth
  fields, or a sibling `PathogenBehavior`? *(Lean: extend — it makes toxin a
  strict subset and every existing seed stays valid.)*
- **The room contaminant slot** — a parallel `_contaminants: Record<string,
  number>` on `Atmospheric`, or a room-scoped burden like `airReserveOf`?
  *(The design pack settled this as the map — absorbed Part 7, fork 3.)*
- **Does `resolution.by` finally get a dispatcher**, and is that this build's
  job or the medicine branch's?
- **Herd-scale representation** — prevalence as an aggregate scalar (matching
  the density dial) vs per-head records for a slotted breeding tier.
- **Plant "conditions"** — does a crop carry an `AfflictionRecord` on a plot, or
  does farming's own state model absorb it? *(The record is host-agnostic; only
  the effect needs interpreting.)*
- **How much epidemiology surfaces** — R₀ and prevalence as *instrument reads*
  (the farming error-bar tier) or as bands only?
- **Numeric calibration** — every rate. Deferred to a running game, as farming
  and ranching both did.
