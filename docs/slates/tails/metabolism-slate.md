# Metabolism slate (working doc)

> **Status: PARTIAL** — both build waves shipped 2026-06 (digestion
> buffer, lazy reconcile, toxins, `eat`/`vomit`), plus the coupled-recovery
> keystone's later generalization to N consumers (magic-items D10) →
> [metabolism.md](../../subsystems/metabolism.md)
> **Left:** the wider deficiency roster (iron, the B group, calcium — scurvy
> SHIPPED with nutrition-and-fitness as the pattern: a reserve key + a
> route + a condition row) · `alcohol-tolerance` as a CONSUMER (the `bac`
> bands widened by the stock; the stock ships) · nutrient-ledger storage
> shape · real-nutrition-data pipeline · hangover · chronic-toxin leaching
> content (lead) · forageable identification content · fuller-stomach
> absorption coupling · bulk-source/communal eating · per-individual
> rates · the buff-economy proposal (nutrition upside) · the
> ambient-civilization-vs-expedition water-scarcity reframe · away-recovery
> on voluntary logout (contradicts the shipped far-past guard — see
> physiology ledger)
> **Size:** a tail

Working slate for **metabolism** — the body's intake-and-chemistry system,
the consumer the reserve substrate was built for and the convergence point
for everything the vitals and encumbrance builds left dangling. It
**drives the survival reserves** (satiation/hydration — hunger and thirst),
**closes the endurance-recovery loop** deferred out of encumbrance,
**consumes** `Material` through the `ingest` seam, and **gives the named
floor-effects their first consumers** (`collapse`/`starvation`/`dehydration`).

**Two phases, one slate (one coherent system, joined at the digestion
buffer):**
1. **The energy economy** — the three reserves, coupled recovery, basal
   drain, the cascade, the in-session clock + sleep.
2. **Nutrients & toxicity** — what a meal *is* (the real-data nutrient
   ledger, macro routing, curated deficiencies) and what a bad meal *does*
   (toxin burden → poisoning, the `vomit` window). Routes through the same
   buffer. (Magic ingestion shipped superseded — see § *Demand-driven
   seams* below.)

Member of the **Vitals & survival** build, sibling of
[vitals-slate](./vitals-slate.md) and [encumbrance-slate](./encumbrance-slate.md).
Designed back-to-back with **thermal** (the heat seam below resolves in
the thermal pass), and built after both encumbrance and the bulkable/
`ingest` substrate land.

See also (read before building — substrate this leans on):

- [docs/subsystems/reserve.md](../../subsystems/reserve.md) — the
  `Reserve` axis; biological reserves (`endurance`/`satiation`/
  `hydration`) "differ only in what drains them, what replenishes them."
  Metabolism is that driver. The `floorEffect` strings get their consumers
  here.
- [docs/subsystems/vitals.md](../../subsystems/vitals.md) — the
  condition/trauma system (progress + resolve + death seam) that the
  cascade rides; `getConditionBand`, the death transition.
- [encumbrance-slate](./encumbrance-slate.md) — the **discrete exertion**
  half (event-based endurance drain). Metabolism is the **continuous**
  half (basal + recovery). They layer on one reserve.
- [docs/subsystems/posture.md](../../subsystems/posture.md) — `Posed`
  (actor posture) + `Postured` (furniture posture-bearing slots); the rest
  gate.
- [bulkable-slate](../tails/bulkable-slate.md) — `sip`/`drink` (and the
  `ingest` seam) ride bulk; intake depends on this.
- [thermal-slate](../tails/thermal-slate.md) — the heat seam (fuel-burn
  produces warmth; thermoregulation demands fuel/water). Resolved in the
  thermal design pass, before build.
- `Material.edibility`/`nutrients`/`toxicity` (the `DietApi`-deferred
  tags) — what `ingest` reads.

---

## Coupled recovery — the mechanics

Falling straight out of "recovery burns fuel":

- **Conversion isn't free — the loss is body heat.** Burning fuel for
  stamina is ~25% efficient; the rest is warmth. Your body is a furnace;
  metabolism is what keeps you warm; **this is why a starving body feels
  cold**. → the thermal seam (below).

*(Rest quality — bed vs. floor: superseded by the shipped shape, see
[metabolism.md § Coupled recovery — the keystone](../../subsystems/metabolism.md)
— `restQuality` landed on `PosturedMixin`, not on `SlotSpec` as designed
here; the universal `SlotSpec` stayed a pure structural mechanism.)*

---

## Intake — per-individual rates (still open)

**Per-consumable vs per-player.** The *amount/energy* a food yields is
**per-consumable** — authored on the `Material` (a stew yields more per
unit than water; that's `nutrients` density). Constant for the food. The
*rate* a body digests/recovers is a **universe dial in v1**, uniform across
players; per-individual variation, when earned, **derives from physiology**
(body mass, condition, species), never a stat (no "constitution").
(The digestion buffer, overeating cap, and `sip`/`drink`→`ingest` wiring
shipped — see
[metabolism.md § The digestion buffer](../../subsystems/metabolism.md).)

---

## Presence, sleep, and the in-session clock

Active-play-only metabolism and the linkdead freeze shipped as designed
— see
[metabolism.md § The in-session clock + presence freeze](../../subsystems/metabolism.md).
**Still open, and contradicted by what shipped:**

- **Voluntary logout = sleep** → basal still frozen (no starving from
  absence), but **recovery runs** — burning a little stored fuel to wake
  with endurance refilled, at the bed/inn `restQuality` rate. This is the
  reward for *choosing* to bed down; linkdead doesn't get it because you
  didn't choose to sleep. And because logout puts your body to sleep **in
  place** (no positional state lost), there's no reason to prefer the
  plug-pull when you're safe — proper logout-in-a-bed is strictly better
  (recovery + safety), which is the soft "find a bed before you sign off"
  pull, *incentivized, not forced.*

  ⚠ **Shipped as the opposite.** `Metabolic.reconcileMetabolism`'s
  far-past guard drops a gap over `MAX_REASONABLE_GAP_SEC` (4h) for any
  body nobody owns (`integratesLongAbsence()` is false), so a logged-out
  player accrues **no** away-recovery regardless of what furniture they
  logged out on, and metabolism.md states outright: "there is no
  sleeping player body and no away-recovery." This is the three-way
  disagreement tracked in `docs/plans/slate-compaction/physiology.md`
  (furnishing.md's bed-integrates-elapsed-hours claim is the third
  party). Not resolved here.

---

## Phase 2 — Nutrients (what a meal *is*)

Phase 1 treats food as undifferentiated fuel. Phase 2 differentiates it,
and the **real-data angle dissolves the "what do you model" problem**: you
don't curate the nutrient list — you adopt the real one. USDA-style
profiles already enumerate the whole taxonomy with amounts per food.

- **The nutrient ledger.** The body tracks an **open, keyed nutrient
  vector**, seeded from real nutrition data — the twin of the reserve
  keyspace ("the engine ships the axis; content names the instances"). The
  digestion buffer routes each food's nutrient tags into the ledger.
  Comprehensive and cheap (it's bookkeeping), and **the ledger *is* the
  education** — "you're low on iron" is the lesson, independent of any
  gameplay teeth. Real food catalog = a **content workstream** (the
  substrate ships before the full catalog is authored).
- **Micronutrients: full ledger, curated consequences.** Real data gives
  the inputs and requirements; it does *not* give the effects of
  deficiency. So the ledger is comprehensive but only a **curated few**
  deficiencies are wired to conditions — **scurvy** the canonical (no
  vitamin C → a progressing condition, resolved by citrus). Driven by the
  metabolism reconcile, like the cascade.

  > **Timescale (a dial, intended shape):** on the in-session clock,
  > deficiencies accrue only over *active-play* time, so scurvy realistically
  > bites only on a genuinely long haul — a sea voyage, a siege, a deep
  > expedition. That's deliberate: deficiencies are a **rare,
  > expedition-grade** mechanic and a provisioning decision, *not* daily-diet
  > management. Tunable if it should register sooner.

## Phase 2 — Toxicity (what a bad meal *does*)

The mirror of nutrients: things the body is **harmed by**. Authored on
`Material.toxicity` (typed tags like `lead`, `iron-poisoning`).

(Dose × potency → per-toxin body burden → a banded poisoning condition,
the vomit/purge counterplay, and antidote-as-accelerated-clearance all
shipped as designed — see
[metabolism.md § Toxin burdens](../../subsystems/metabolism.md) and
[§ `vomit` + antidote](../../subsystems/metabolism.md). The chronic-
accumulation *mechanism* shipped too (lead); the leaching *content*
around it has not — see status block.)

- Curated named toxins: spoiled food, venom, **alcohol** (the stress-test —
  simultaneously fuel + slight hydration + an intoxication toxin; *Dave's
  bar* runs on this), forageables (which berry/mushroom — ties to
  identification). Education: dose-makes-the-poison; lead plumbing; foraging.

*(Spoilage shipped as its own subsystem — see [spoilage.md](../../subsystems/spoilage.md)
and [metabolism.md § Ptomaine is no longer authored per row](../../subsystems/metabolism.md),
which documents exactly the toxicity-socket coupling this box anticipated.)*

---

## Demand-driven seams (model the live half, seam the rest)

Oxygen (spo2) and healing (protein→repair) remain named-but-undriven
seams exactly as designed — see
[metabolism.md § Inert seams](../../subsystems/metabolism.md). The
temperature two-port coupling shipped in full — see
[thermal.md § `ThermalRegulationMixin`](../../subsystems/thermal.md).
Magic ingestion shipped **superseded** by a different, simpler shape:
no separate magic-reserve routing was needed — mana became the
**second consumer of the coupled-recovery keystone** itself
(`coupledConsumers()`), so a mana draught is ordinary carbohydrate/water
and needs no new pathway. See
[metabolism.md § Coupled recovery — the keystone](../../subsystems/metabolism.md)
and [magic-items.md § Mana recovery](../../subsystems/magic-items.md).

---

## The fun trap — the still-open reframe

> The measured tuning outcome (basal invisible, exertion ~47× basal —
> confirmed 2026-07-31) shipped and is documented in full at
> [metabolism.md § Rates](../../subsystems/metabolism.md). **What is
> still missing is the *point* of it.** "Carry water" is only a
> decision if there is somewhere water is scarce. The reframe: **ambient in
> civilization** (a fountain or tap makes drinking trivial and thoughtless) and
> **a real constraint on expedition** (the mine, the wilds, a frontier
> holding, a hot day). That turns hydration from a bar into a **packing
> decision**, and it
> makes thermal + weather genuine inputs rather than decoration.

---

## Add the upside — the buff economy **[PROPOSED 2026-07-31]**

Today nutrition can only **penalize**: hydration *throttles* endurance recovery
below 30%, deficiencies degrade, and protein routes into an inert pool that
drains nowhere. There is no state where eating *well* puts you above baseline —
only states where eating badly puts you below it.

> **Proposal: give good nutrition a real, visible benefit, so the mechanic
> becomes *seek benefit* rather than *avoid punishment*.**

### Why — the economic argument, not the feel argument

This is load-bearing for the [guild](../builds/guild-slate.md) roster, where
metabolism is the Grange's and Victuallers' audited paymaster ("everyone eats;
per-capita demand never zero"):

- A **starvation** model creates demand for the **cheapest calories**. Bulk
  commodity, price-only competition, quality irrelevant.
- A **buff** model creates demand for **good food** — which is what makes
  farming's `Grade` bands, cultivar composition, cooking, and brewing
  economically meaningful instead of decorative.

The whole upstream chain (soil → cultivar → harvest quality → recipe → dish)
only *pays* if someone downstream cares about quality. Under starvation-only,
nobody does.

### It is not a fictionalization

Good nutrition genuinely improves performance — that is real physiology the
model currently represents **only in the negative direction**. Adding the upside
makes it *more* faithful, not less. The `protein → tissue-repair` seam already
sketched here is exactly this shape, still inert.

### Prior art — the pattern is unusually consistent

**Time-driven hunger/thirst attrition is the most reliably disliked mechanic in
the survival genre.** Games resolve it three ways:

| Resolution | Examples | Lesson |
|---|---|---|
| **Make it the point** | Don't Starve · The Long Dark · DayZ · Rust | works, but it becomes the game's identity |
| **Convert to a buff economy** | **Valheim** (timed food slots granting HP/stamina; you never starve, you just get weak) · Breath of the Wild (no hunger at all; food is heal + buff) | the best-regarded version; *seek benefit*, not *avoid punishment* |
| **Defang it** | EverQuest + classic DikuMUDs (food/drink timers, remembered as busywork; EQ eventually made them near-cosmetic) · WoW (food/drink as out-of-combat regen, no starvation) · Subnautica (kept real thirst; the most-complained-about early-game element, later given a mode without it) | the MUD lineage's verdict is **negative** — and it is the tradition this project inherits from |

**Valheim is the model to follow**, with the caveat that its food is a pure
timed buff with no underlying physiology. Here the physiology already exists —
so the move is to *surface its upside*, not to replace it with a buff timer.

### Open

- **What the upside actually grants.** Endurance ceiling, recovery rate, carry,
  focus, cold tolerance? *Lean: the reserves and rates already modeled — raise
  the ceiling and the recovery rate, never invent a stat.*
- **Duration vs. state.** Valheim-style timed slots, or a continuous
  nutrition-quality state derived from the keyed nutrient ledger? *Lean: the
  latter — the ledger already exists and a derived state avoids a parallel
  buff-timer system.*
- **Legibility.** How a player reads "well fed" without a numeric gauge —
  presumably the same banded, described-not-numbered surface as competence.

---

## Physics vs. game design

The split lands cleanly:

- **Structure = physics → nail it now.** The stores, the timescales, the
  recovery-burns-fuel coupling, the flows, the cascade-through-conditions,
  the lazy reconcile; and (Phase 2) the keyed nutrient ledger, macro
  routing, and dose × potency × body-mass → burden → condition. This slate.
- **Rates = game-design dials → defer to playtest.** Basal speed, recovery
  rate + fuel/water split, conversion-loss fraction, digestion rate + stomach
  volume, `restQuality` magnitudes, how fast you starve; and (Phase 2) per-
  toxin potencies + clear rates, deficiency timescales, which deficiencies
  are wired. v1 ships defensible defaults; tuning is content.
- **One deliberate override.** The **in-session metabolic clock** (you get
  hungry from playing, not from absence) is a spot where the *game-design
  fairness constraint caps the physics* — strictly a body metabolizes 24/7,
  but "don't punish people for having lives" wins. A conscious exception,
  not an oversight.

---

## Scope — what's actually left

Both phases shipped (see [metabolism.md](../../subsystems/metabolism.md)).
**Genuinely still out:** oxygen/breathing coupling (no driver);
per-individual metabolic rates; rich micronutrient *consequences* beyond
the curated few (scurvy); all numeric tuning. (Thermoregulation coupling
and magic ingestion shipped — see § *Demand-driven seams* above. Waste
material is now a documented "never a mechanic" call — see
[metabolism.md § Deliberately not modeled](../../subsystems/metabolism.md).)

---

## Other still-open items (never more than named)

These were named in the status block from the start and never grew a
body section; still genuinely unbuilt (verified against
`Metabolic.ts` — no matching mechanism anywhere):

- **Hangover** — the one alcohol after-effect that can't be a band of
  the *current* BAC burden (BAC clears to 0 and the after-effect should
  persist a while longer).
- **Fuller-stomach-slows-absorption** — a coupling between remaining
  stomach volume and digestion rate (eating more slows how fast any of
  it lands).
- **Bulk-source / communal eating** — eating from a shared pot/trough
  rather than a personal ration.

## Open questions

(Basal mass-exponent, recovery's fuel/water split, reconcile granularity,
digestion sub-capacities, where the flow logic lives, collapse's exact
incapacitation, and toxin tag shape all resolved — shipped as documented
in [metabolism.md](../../subsystems/metabolism.md); the presence-flags
question resolved in a different shape — metabolism reads presence
directly (`isLinkdead()`), receiving nothing pushed, and no sleep flag
exists — see the § *Presence, sleep* note above.)

- **(Phase 2) Nutrient ledger storage.** An open keyed vector seeded from
  real data — a `Reserved`-style keyed Record, or its own keyspace? Mirror
  the reserve substrate's decomposed-scalar persistence. And: is the ledger
  on every `Creature`, or only those that care (the don't-widen rule)?
- **(Phase 2) Real-nutrition-data pipeline.** Source (USDA FoodData
  Central?), the import/mapping to the nutrient keyspace, and how authored
  food templates carry profiles. A content/tooling workstream to scope
  separately.

---

## Cross-references

- [reserve.md](../../subsystems/reserve.md) — the axis + floor-effects.
- [vitals.md](../../subsystems/vitals.md) — the condition system + death
  seam the cascade rides.
- [encumbrance-slate](./encumbrance-slate.md) — the discrete-exertion half.
- [posture.md](../../subsystems/posture.md) — `Posed`/`Postured`; the rest
  gate.
- [bulkable-slate](../tails/bulkable-slate.md) — `sip`/`drink`/`ingest`,
  the intake mechanism.
- [thermal-slate](../tails/thermal-slate.md) — the heat seam, resolved in
  the thermal pass.
- [connection.md](../../subsystems/connection.md) — the linkdead/logout
  lifecycle metabolism's presence read depends on.
- [race.md](../../subsystems/race.md) — `Material.nutrients`/`toxicity`/
  `edibility`, the authored tags Phase 2 reads (the deferred `DietApi`'s
  real home).

---

## Diets — no mechanism, on purpose (noted 2026-09-18)

A diet is a *pattern of choices*, and the nutrition & fitness build's
months clock renders patterns onto bodies; the engine is honest, so a
fad diet does exactly what it does in reality. Two things are content,
neither is machinery: **a healthy diet is derivable** — it is *variety*,
covering the micronutrient kinds (the towns slate's *"a monotonous diet
sickens"* finally has its mechanism); **a fad diet is a claim** — a
knowledge product (the dietician beside the trainer) or a *belief* (the
belief substrate handles misinformation natively), whose label is
honest and whose marketing is not — the supplement lesson. ⚠ The macro
model is thin (fat = slow satiation, carb = fast, protein → lean); a
keto pattern and a high-carb one differ mostly in the lean stock. More
macro physiology waits for a lesson that needs it.
