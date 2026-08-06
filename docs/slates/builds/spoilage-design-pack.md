# Spoilage / `Freshness` design pack — the archetype-2 keystone

> **Status: design, planner-ready, captured 2026-08-06. Not requirements.**
> The **keystone** of the stewardship pillar and the direct dependency of the
> whole cold-storage stack. [preservation-slate](./preservation-slate.md) owns
> the *rationale* (why, Law-2 legality, the agricultural year, salt, the trade
> geography); **this pack is the planner-ready spec** — the mixin, the honest
> physics, the interop, and the open forks **settled**. Same per-object format
> as the [fridge pack](./fridge-design-pack.md).

See also: [preservation-slate](./preservation-slate.md) (rationale) ·
[stewardship-doctrine § archetype 2](../stewardship-doctrine.md) ·
[metabolism](../../subsystems/metabolism.md) (`ptomaine`, the ingest rung) ·
[thermal](../../subsystems/thermal.md) (the temperature driver) ·
[disease-slate](./disease-slate.md) (**inherits this growth term**) ·
`WetMixin` (water activity) · [crafting](../../subsystems/crafting.md)
(`Durable`/`Keen` — the two-axis precedent; the preserving branch).

---

## Part 0 — What it is, and why it's the keystone

**A gauge on perishable matter that tracks microbial load, growing over
world-time at a rate set by the food's temperature and water activity; past a
threshold the food turns toxic (`ptomaine`).** It is **archetype 2** (flux
decay — the clock starts at an act: harvest/catch/cook) from the stewardship
doctrine, and it is the first and cheapest **producer** of that archetype.

Why it's the keystone: *one deferral, eight consequences* (preservation-slate).
It gives the fridge/icebox a point, wakes winter/preservation/salt/the trade
geography, and **proves the growth term that disease then inherits working.**
Build it first; it depends on nothing else in the family.

---

## Part 1 — Designed to the per-object format

**1. What it is, mechanically.** Above — a third wear axis beside `Durable`
(`condition`, use-driven) and `Keen` (`keenness`, use-driven): **`Freshness`,
environment-driven, its own cadence, its own bands.**

**2. Composition.** `Freshness` rides a perishable `Material` host that also
carries a temperature and a wetness:

```
Perishable  =  Freshness( Thermal( Wet( … Thing )))         (discrete: a fish)
              — or the same three gauges expressed on a BulkPayload (a barrel of salt pork)
```

**3. New or updated mixins.**

| | Work | State |
|---|---|---|
| ⭐ **`FreshnessMixin`** (`lib/material/`) | the gauge + reconcile-on-read (copy `Wet.ts`'s skeleton, ~120 lines) | **new** |
| ✳ **`ThermalMixin` on perishables** | so food *has* a temperature to read — the real cost preservation-slate flags (a sack of grain has none today) | **compose** |
| ✳ **the ingest toxicity rung** | a **freshness override ahead of the `Material` fallback** in `Metabolic.ts` (`payload?.toxicity ?? material.getToxicity()` already shadows per-instance for bulk) | **1-line reach** |
| ⭐ **`Material` field** | the spoilage-rate constant — a **real `Quantity`** (activation energy + a water-activity threshold), never `perishability: 0.7` | **new tabulated data** |

**4. Verbs & affordances.** *None new.* Freshness is a **read** (a band on
`look`/`smell`), it degrades on its own reconcile, and it is *countered* by
existing/authored acts: put it in the cold (containment → thermal), dry/salt it
(the preserving crafting branch, Part 4). No player verb "refreshes" food.

**5. Persisted fields.** The microbial-load scalar + its clock stamp (the
`Wet.ts` pair). Banded read derives; nothing else stored. Round-trips like
`condition`/`keenness`/wetness.

**6. Seams & dependencies.** Needs **`ThermalMixin` on the host** (temperature)
and the **Condition substrate live** (doctrine Part 6) for the `ptomaine`
payoff to fire. Everything downstream — pool → burden → band → `ptomaine` →
the vomit window → the antidote — **already ships**.

**7. Fault line.** This **is** fault-line [1] "spoilage core" from the fridge
pack — the keystone, built first, independent of every cold-storage object.

---

## Part 2 — The physics (honest)

Spoilage **is** microbial growth, so the honest model is real **predictive
microbiology** — the same math food scientists actually use (Gompertz/Baranyi;
ComBase), not a decay dial:

```
dN/dt = μ · N · (1 − N/K)                    logistic growth, load N toward carrying capacity K
μ     = μ_max · f_T(T) · f_aw(a_w)           the rate, gated by two real drivers
```

- **Temperature `f_T`** — an **Arrhenius / Q10** rise across the useful range
  (rate ~doubles per +10 °C): cold → slow (the fridge), warm → fast, **frozen →
  paused**, and hot (**cooking, >~60 °C**) → a *kill* (the reset, Part 4). This
  is the real **"danger zone"** (roughly 4–60 °C) rendered as physics.
- **Water activity `f_aw`** — growth needs `a_w` above a threshold (bacteria
  ~0.90, molds ~0.70, nothing below ~0.60). **Below the threshold, μ → 0.** That
  single fact is why **salt cod, jerky, and honey keep essentially forever** —
  and it *is* how salting/drying preserve (they push `a_w` down), read straight
  off the shipped `WetMixin` water-activity gauge.

> **Preservation lowers the rate; it never stops the clock** (asymptotic and
> forgiving, the family shape) — except the two genuine floors, freezing (`f_T`
> → ~0) and `a_w` below threshold (`f_aw` → 0), which are physically real
> "effectively forever" states, not exceptions to fake.

**Two divergences from the copied `Wet.ts` skeleton** (preservation-slate,
kept): **drop the far-past guard** — *food is not a body*, it rots over the
full absence (archetype 2, runs-over-absence); and the **linkdead freeze** never
fires (an item has no Interactive) — harmless, don't copy it believing it does
something.

---

## Part 3 — Pedagogically rich

The single richest food-science surface the game can own, and every piece is
something **a student can be wrong about**:

- **Predictive microbiology** — the logistic curve teaches the **lag → exponential
  → stationary** shape: *why food looks fine, then rots fast.*
- **The temperature–rate law** — why the fridge works, why the danger zone
  exists, why freezing **pauses** but does not **sterilize** (the load is still
  there, waiting).
- **Water activity** — the deepest and least-known: *why salt/sugar/drying
  preserve*, and why some cured goods are eternal — the `a_w` threshold, not
  "magic salt."
- **The disease bridge** — it is *literally* the same equation as
  [disease-slate](./disease-slate.md) minus transmission. A student who
  understands the spoiling fish understands the epidemic curve.

**Item-generator hooks** (keys computed by running the reconcile — the
college-slate evaluator contract):
- *"Fish at 20 °C, `a_w` 0.99, `Ea` = X — hours to the hazard band?"*
- *"You salt it to `a_w` 0.75 — now how long?"* (`f_aw` → 0: **shelf-stable** —
  the distractor is "a bit longer," the misconception being that salt *slows*
  rather than *stops*).
- *"It's frozen for a month, then left out at 25 °C — how long until unsafe?"*
  (freezing paused the load at its pre-freeze level; the clock resumes from
  there, not from fresh — a characteristic error worth a distractor).

---

## Part 4 — Interoperation

Same principle as the fridge: **`Freshness` introduces no special cases — it is
a `Material` gauge, and every system reacts through its own model.**

- **⭐ Thermal (the whole cold-storage stack is this interop).** `f_T` reads the
  host's `ThermalMixin` temperature, which reads its environment via the biome
  walk — so **the fridge/icebox/cellar slow spoilage for free**, and *summer
  rots / winter keeps* falls out of the seasonal biome ambient. This is the seam
  the entire fridge pack exists to drive.
- **⭐ Metabolism (the payoff).** The freshness override rung → `ptomaine` toxin
  burden → food poisoning → the vomit/antidote loop, **all shipped**. Gated on
  Condition-live.
- **Bulk.** The rung is *already* bulk-reachable (`BulkPayload` shadows
  `Material`), so a barrel of salt pork spoils by the same path; the gauge lives
  on the payload for bulk, on the `Thing` for a discrete fish.
- **`WetMixin` (water activity).** The `f_aw` driver — universal and shipped;
  drying/salting move it. "Shelter dries faster" already emerges (preservation-
  slate), so **storing food indoors already helps** with no new code.
- **Crafting (the preserving branch + cooking).** Curing/smoking/salting are
  **rate-reducer recipes** on `outputApplication: 'tangible'` (flows input
  Material+mass onto the output — the fresh→cured swap). **Cooking** interacts
  with `f_T`'s kill: heat resets the load toward fresh — *but* the cooked
  material may carry a higher base rate (cooked meat spoils faster than raw
  salted). That is **why cooking matters past nutrition.**
- **Husbandry.** `Freshness` copies husbandry's run-over-absence clock; and *the
  clock starts at the act* — a growing crop isn't spoiling, a **harvested** one
  is. Harvest is the hand-off from husbandry (growth) to spoilage (decay).
- **Persistence.** Food + its load + stamp survive dorm/reap; on materialize the
  reconcile integrates the offline gap **at the stored/cold rate** (the fridge-
  pack ordering caveat: atmosphere before contents).
- **Disease (downstream).** Build the growth term here; disease adds the
  transmission half (`ContagionSpec`, host range) on top. *"Build it here, prove
  it on a fish, and disease inherits it working."*

---

## Part 5 — The forks, settled

1. **Material constant form → Arrhenius activation energy `Ea` + an `a_w`
   threshold.** Real, tabulated (like `specificHeat`, `electricalConductivity`),
   derivable, and it moves honestly with temperature. **Not** a shelf-life
   scalar (a lookup that can't extrapolate) and **not** a fake 0–1. Same logic
   as the fridge's COP fork: *derivable law over device lookup.* Fish low `Ea`
   (fast), grain high, salt/honey below threshold (never) — as physics.
2. **Where composed → universal-and-inert** on perishable-eligible `Thing`s
   (the `WetMixin` pattern): the mixin is present everywhere but **does nothing
   unless the `Material` carries an `Ea`**, so authoring a perishable is adding a
   data field, not composing a class. (Accept the per-object field cost, as
   wetness does.)
3. **Cooking → resets the load, by method.** Heat kills current load (toward
   fresh); the cooked material may spoil *faster* thereafter. A real, teachable
   reason cooking is more than nutrition. (Detailed method table deferred.)
4. **Sealing → binary v1.** Excludes air (slows aerobic/oxidative spoilage,
   mold) but not anaerobic — so sealing is a **modest** rate reducer, not a
   stopper. Physics deferred; the honest v1 is "sealed slows, doesn't stop."
5. **Never delete; never erode `Grade`.** Degrade toward hazardous, not
   vanished. `Grade` (the maker's verdict) and `Freshness` (entropy) stay
   orthogonal — `gradeConditionScale` already multiplies grade × condition; a
   masterwork rots like anything else.

---

## Part 6 — Build order note

This is **step 1 of the fridge pack's fault lines** and **step 2 of the
stewardship doctrine's build order** (behind only "make Condition live"). It is
the cheapest instance of the whole archetype-2 thesis and unblocks the most:
the cold-storage stack, disease, the agricultural year, salt, and the
preserving crafting branch. **v1 scope** (preservation-slate): one perishable
class (fish), the gauge, `ThermalMixin` on it, the rate from `T × a_w × Ea`, one
counterplay (salt — author the Material + a curing recipe), the banded read, the
freshness rung. Then drying/cold/smoking and the trade geography follow.

---

## Open questions / forks

1. **The `a_w` ↔ `WetMixin` mapping.** `WetMixin` bands `dry/damp/wet/soaked`;
   `a_w` is a 0–1 activity. Confirm the wetness gauge exposes (or can derive) a
   real `a_w`, or add the conversion — the `f_aw` driver depends on it.
2. **Discrete vs bulk gauge parity.** The gauge on a `Thing` and on a
   `BulkPayload` must read/round-trip identically; does `BulkPayload` gain a
   freshness field (preservation-slate's open Q)?
3. **The hazard band → `ptomaine` dose mapping.** How microbial load maps to the
   `ptomaine` toxin dose (a curve, not a step, so "slightly off" food is mildly
   risky) — the last content calibration before it's playable.
4. **Numeric calibration** — every `Ea`, every threshold. Deferred to a running
   game, as the family always does.
