# Disease design pack — the capstone (transmission over the growth term)

> **Status: design, planner-ready, captured 2026-08-06. Not requirements.**
> The **capstone** of the stewardship pillar — the system where every producer
> connects. [disease-slate](./disease-slate.md) owns the rationale; this pack is
> the planner-ready spec, built on the [spoilage pack](./spoilage-design-pack.md)
> (which proves the growth term) and the [room-condition pack](./room-condition-design-pack.md)
> (the hygiene half of immunity). Same per-object format as the rest of the pillar.

See also: [disease-slate](./disease-slate.md) (rationale, the substrate audit) ·
[spoilage-design-pack](./spoilage-design-pack.md) (**the growth term this
inherits**) · [room-condition](./room-condition-design-pack.md) + husbandry
(**"care is immunity"** across hosts) · [metabolism](../../subsystems/metabolism.md)
(the `toxinBehavior` burden engine) · [vitals](../../subsystems/vitals.md)
(`Condition`, `Resists.factor`) · fire (**the propagation shape to copy**) ·
[health-vertical-slate](./health-vertical-slate.md) (the clinical/pedagogical payoff).

---

## Part 0 — What it is, and why it's the capstone

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

## Part 1 — Designed to the per-object format

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

**The two idioms, not one** (disease-slate's most important call): **within-host
load = reconcile-on-read** (the 9th host on the shared pattern — presence-frozen
for your body, world-time for your herd, *"you never log in sicker than you
logged off, but you can log in to a sick herd"*); **between-room spread = a push
tick** (Fire's shape — propagation must happen where no one is looking).

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

## Part 2 — `ContagionSpec` (the one thing to design)

```
ContagionSpec { routes[], infectivity, infectiousWindow, hostRange, reservoir }
```

- **Routes** — most already have a shipped hook: **contact** (co-location),
  **airborne** (the smoke→CO env→body loop is *shipped end-to-end*; blocked only
  by the single-tag `_atmosphere` → the contaminant map above), **foodborne**
  (`ingest` routes arbitrary `tox.type` — **works today**), **waterborne**
  (`BulkPayload.toxicity[]` open solute list), **fomite** (an object carrying a
  load — chattel + containment; **a dirty hand from room-condition is a fomite**),
  **vector** (mobile carrier), **vertical** (`SpawnerMixin` edge).
- **Host range → over the shipped `Clade` tree** (`animalia`/`plantae`/`fungi`/
  `constructa`): species / genus / clade / cross-clade for free. **Default
  containment, deliberate crossing** — a crop blight stays in crops, a herd
  disease in cattle, but an authored **zoonosis crosses** and becomes a public-
  health problem. Most content contained; crossing rare, deliberate, a big deal.
- **Reservoir** — where it persists between hosts (wild population, soil,
  standing water, a carrier). This is what makes rule 1 (never ambient)
  enforceable and an outbreak **traceable**.

---

## Part 3 — ⭐⭐ The two unifications that make it the capstone

**1. Care is immunity — pointed at *every* host.** disease-slate's keystone:
`Resists.factor` reads **live off host state**, so the care-derived condition
score *is* the resistance term — disease is the **consequence of care, not a
dice roll**. We have now built that condition score for **four hosts**: the
**herd** (husbandry), the **crop** (soil), the **body** (hygiene — room
condition's `Soilable`), and the **home** (room condition). **One resistance
model, every host** — a well-fed animal, a rotated field, clean hands, a tidy
home are the *same* immunity seam. Good stewardship *is* not getting sick.

**2. Disease is the shadow of the density dial.** Every scaling lever in the
family points toward *more* — monoculture coverage, stocking rate, paddock
concentration, pond stocking, the companion ceiling, urban population. **Disease
is the price of concentration, and it is the same price everywhere** — the
counterweight the family structurally lacks. Density × care is the two-dial
decision: crowded-and-kept survives, crowded-and-neglected is an outbreak.

---

## Part 4 — Keeping it un-miserable (disease-slate's four rules)

1. **Never ambient** — must have a **source/reservoir**. A careful isolated
   operation is genuinely safe; risk arrives with trade, movement, crowding,
   contact with the wild. Converts disease from a random tax into a consequence
   of choices (+ care, via immunity).
2. **Legible before lethal** — `observableSigns` ships; incubation → visible →
   acute gives a window, and **noticing is the skill** (`assess` + `medicine`).
3. **Prevention is practice, not purchase** — rotation, spacing, quarantine,
   sanitation, culling. All teachable; all *are* what husbandry/stewardship is.
4. **Forgiveness holds** — it costs; it does not delete (outside raised stakes).

Two payoffs fall out free: a **closed door is quarantine** (`openNeighboursOf`,
promote it), and **an outbreak is an investigation** — routes + recordable
contact make **patient zero discoverable**, so an epidemic is a *mystery*, not a
debuff (feeds the inquiry vein).

---

## Part 5 — Pedagogy: the public-health capstone

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

## Part 6 — Interop (the connective tissue)

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

## Part 7 — Forks settled

1. **Growth term → extend `ToxinBehavior`** (not a sibling `PathogenBehavior`):
   makes toxin a strict subset, every existing seed stays valid. Shared with the
   spoilage pack — one growth term, two consumers.
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

1. **Does `resolution.by` finally get a dispatcher?** — the thin **medic
   vertical** (`treat` is trauma-only today; `resolution.by` is dead prose on
   every seed). This build's job, or the medicine branch's?
2. **Herd-scale representation** — prevalence as an aggregate scalar (matching
   the density dial) vs per-head `AfflictionRecord`s for a slotted breeding tier.
3. **How much epidemiology surfaces** — R₀ / prevalence as *instrument reads*
   (the farming error-bar tier) or as bands only?
4. **Numeric calibration** — every rate, every route's infectivity. Deferred to a
   running game, as the family always does.
