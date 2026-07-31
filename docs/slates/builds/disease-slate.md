# Disease slate — infection, transmission, and the price of density

> **Status: design captured 2026-07-31, not built.** Disease is the one mechanic
> that touches **every living thing in the game** — crops, herds, companions,
> fish, NPCs, and the player's own body — so it gets its own doc rather than a
> section inside any one consumer.
>
> The headline from the substrate audit: **the seam is already cut.** Every
> shipped `Condition` seed carries `contagion: null`, and `toxinBehavior` is a
> complete within-host burden engine. The delta for a whole disease system is
> **two things** — one new number (a growth term) and one filled-in spec
> (`ContagionSpec`).
>
> The design connection worth leading with: **good husbandry *is* immunity.**
> The resist substrate's susceptibility factor reads **live off host state**, so
> the condition score the husbandry family already computes becomes the
> resistance term. Disease stops being a dice roll and becomes the consequence
> of care.

See also — **the vertical this engine serves**:
[health-vertical-slate](./health-vertical-slate.md) (clinical practice, public
health, the College of Physic, and the teaching seam — the *pedagogical* payoff
of everything below).
Consumers: [farming](./farming-slate.md) (blight; rotation's *true* reason) · [ranching](./ranching-slate.md) (**where this question started** —
herd disease was its "biggest open call") · [pets](./pets-slate.md) (the
individual case; the zoonotic bridge) · [fishing](./fishing-slate.md)
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

---

## The seam is already cut

A shipped seed, `seeds/lib/metabolism/conditions/ptomaine.yaml`:

```yaml
class: /lib/vitals/Condition
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

---

## The core model — a burden that grows **[DECIDED]**

The shipped burden is monotone-decreasing: it enters by dose and clears at
`clearanceRate`. A pathogen **replicates**. That is the entire difference.

```
toxin:     dLoad/dt = −clearance
pathogen:  dLoad/dt = growth · load · (1 − load/K) · f(resistance) − clearance
```

**One positive term**, and `ToxinBehavior` becomes a strict subset of a
`PathogenBehavior`. Everything downstream is already shipped and needs no
change: bands → severity, severity → `AfflictionRecord.stage`, `observableSigns`
→ the `assess` read, the burden map → sparse per-key storage, the vomit-purge
window, the antidote crash.

And the real shapes fall out for free rather than being authored:

| Phase | What it is in the model |
|---|---|
| **Incubation** | load below the lowest band — present, growing, **invisible** |
| **Acute** | load high, bands cleared, signs visible |
| **Recovery** | clearance beats growth, load falls back through the bands |
| **Death** | load unbounded, or a vital driven past its floor |

> **Nothing about the progression is authored except the constants.** That is
> the same honesty the family's other models run on — real relationships, tuned
> numbers.

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
linkdead re-stamp, an `elapsed <= 0` guard, the 4-hour far-past guard, and a
reentrancy flag.

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

| Area | State |
|---|---|
| **`Condition` / `AfflictionRecord`** | **EXISTS** — authored `Idea` templates + a six-field runtime record (`kind`, `templatePath`, `stage`, `elapsed`, `magicOrigin?`, `tickedAt?`) |
| **`ContagionSpec`** | **RESERVED** — `{vector: string}`, `null` in all 11 seeds, **zero consumers** |
| **Toxin burden engine** | **EXISTS** — per-toxin sparse keyed burdens; three dose doors (`ingest` / `addToxinBurden` inhaled / `introduceToxin` injected); bands → `stage` |
| **Growth term** | ⚠ **ABSENT — the one structural gap.** Burden is strictly monotone-decreasing; a positive term in `clearBurdens` is the whole change |
| **Contagion / spread** | **ABSENT** — zero code. Shapes to copy: `FireLogic`'s one-hop attenuated neighbour walk; `ElectricityLogic`'s per-event room graph |
| **Airborne loop** | **EXISTS end-to-end** for smoke/CO; blocked only by `_atmosphere` being a single tag |
| **Foodborne** | **EXISTS** — arbitrary `tox.type` routes to any authored seed; **works today** |
| **Waterborne** | **PARTIAL** — `BulkPayload.toxicity[]` is an open solute list; water *quality* is designed in fishing-slate, unbuilt; no mixing arithmetic (transfer rejects rather than blends) |
| **Immunity** | **PARTIAL** — `Resists.fold`/`stageFor(…, factor)` is the right shape, `'toxin'` already an axis; **nothing per-host, no host range** |
| **Vertical transmission** | **ABSENT** — `SpawnerMixin._spawned` is transient and carries no state |
| **Medic vertical** | ⚠ **PARTIAL, thinner than it looks** — `treat` filters to `kind === 'trauma'` and only arrests bleeds; it **structurally cannot see an affliction**. `applyAntidote` is the sole clearance primitive. **`resolution.by` has no dispatcher** — dead prose on every seed |
| **Reconcile-on-read hosts** | **EXISTS** — 8 hosts on one documented idiom; a disease load is a natural 9th |

**Doc bug found:** `harm.md` claims `ConditionApi` "forwards the plain condition
mutators — `afflict` / `relieve` / `conditionsOf`." It does **not**:
`api/condition.ts` exposes exactly one public static, `inflict`, and it is
**trauma-only**. An affliction cannot be inflicted through the Api at all — the
four existing drivers call `host.afflict()` directly from their own mixins. A
disease driver either follows that precedent or adds a gated
`ConditionApi.afflict`.

---

## Where to prove it — crops first

> **Amended 2026-07-31: the *growth term* should be proven earlier, in
> [preservation](./preservation-slate.md).** Food spoilage is **this same
> equation minus transmission** — no `ContagionSpec`, no host range, no
> immunity, no push tick. Build the growth term there, prove it on a fish, and
> disease inherits it working. Crops remain the right first proof of *disease*;
> they are no longer the first proof of the *machinery*.

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

## Open questions

- **Where the growth term lives** — extend `ToxinBehavior` with optional growth
  fields, or a sibling `PathogenBehavior`? *(Lean: extend — it makes toxin a
  strict subset and every existing seed stays valid.)*
- **The room contaminant slot** — a parallel `_contaminants: Record<string,
  number>` on `Atmospheric`, or a room-scoped burden like `airReserveOf`?
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
