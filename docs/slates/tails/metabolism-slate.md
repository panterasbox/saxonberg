# Metabolism slate (working doc)

> **Status (2026-06):** the **build has shipped** (both waves) — the
> digestion buffer + real `ingest`, the lazy reconcile (basal drain,
> coupled recovery, the cascade-to-conditions), the in-session clock +
> presence freeze, `restQuality`, the `eat`/`vomit` verbs, the
> toxin-burden system + alcohol/BAC exemplar, antidote = accelerated
> clearance, and the `NutritionLabel` render all graduated to
> [metabolism.md](../../subsystems/metabolism.md). What remains here is the
> deferred design surface (the tail): wired nutrient deficiencies (scurvy
> — substrate-ready, no consumer yet), hangover (the one after-effect that
> can't be a band of the *current* burden), chronic-toxin exposure
> *content* (the material-leaching pipeline + prodromal staged
> conditions), spoilage / material-aging (perishability), magic ingestion
> (potions), the fuller-stomach-slows-absorption coupling, bulk-food-source
> eating, per-individual rates, recovery-on-relogin, and all numeric
> tuning. The thermal (two ports) and respiration (spo2-read) couplings are
> wired-but-inert seams resolved in those builds.

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
   buffer. (Magic ingestion — mana draughts, effect-potions — is the
   deferred tier behind both.)

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

## Principle

**A body is an energy economy.** Stores (reserves) and flows (rates):
energy comes in (eat/drink), goes out (basal cost of living + activity),
and is shuffled between a fast buffer and slow tanks. Three reserves, the
key being that they sit at **different timescales**:

| Reserve | Role | Timescale |
|---|---|---|
| `endurance` | the **wallet** — immediate stamina, spent on exertion | seconds–minutes |
| `satiation` | the **fuel tank** — food energy | hours |
| `hydration` | the **water tank** — needed for the machinery to run | hours |

The decision that makes this *one machine* and not three bars:

> **Recovery is coupled — the wallet refills by burning fuel.** Endurance
> does not regenerate for free; at rest the body **spends satiation +
> hydration** to rebuild it. So the chain closes: *activity → spends
> endurance → recovery spends fuel → fuel runs down → you must eat.*

This is also why recovery belongs **here, not in encumbrance**:
encumbrance only *drains*; how a reserve *replenishes* is metabolism.

---

## The flows

1. **Basal drain** (whenever the body is *active* — see the in-session
   clock below): `satiation` and `hydration` tick down slowly — just being
   alive costs fuel and water. The survival clock. **Scales with body mass**
   (`BodyPlan.baseMass`, the same body-size signal encumbrance reads) — a
   bigger body burns more but carries bigger tanks. (Real: Kleiber's law; a
   clean education hook. Exact exponent is a dial.)
2. **Activity drain**: exertion spends `endurance` immediately. This is the
   **encumbrance** half — *discrete*, event-based (a spike per loaded
   traversal), already built. Metabolism does not touch it.
3. **Recovery transfer** (at rest): `endurance` climbs by **consuming
   `satiation` + `hydration`**, rate-limited, posture-gated (below).
   *Continuous*, time-based.
4. **Intake**: `ingest(material, amount)` fills a **digestion buffer**
   (stomach), which converts to `satiation`/`hydration` over time (below).
   The `sip`/`drink` verbs already exist and already differ by amount; the
   seam is currently a no-op. Metabolism **implements `ingest`**.

`endurance` is therefore a **balance**: spiky-down from exertion events,
smooth-up from rest (spending fuel), with the tanks trending down from
basal + whatever recovery spent, and topping up as the digestion buffer
drains into them. **Layering, not merging** — the two builds stay separable
(encumbrance = "exertion costs stamina"; metabolism = "stamina and fuel
flow over time"); the encumbrance build needs no change.

---

## Coupled recovery — the mechanics

Falling straight out of "recovery burns fuel":

- **Rate-limited, not instant.** A full tank doesn't snap the wallet back;
  the body converts at a max rate, fastest at rest, tapering as you exert.
- **Draws both tanks.** You can't metabolize without water, so recovery
  spends `satiation` *and* `hydration`. Since dehydration runs faster than
  starvation, **`hydration` is the tighter leash** — the thing that fails
  first on a hard march, and the reason water-before-food is a real ration
  decision.
- **Conversion isn't free — the loss is body heat.** Burning fuel for
  stamina is ~25% efficient; the rest is warmth. Your body is a furnace;
  metabolism is what keeps you warm; **this is why a starving body feels
  cold**. → the thermal seam (below).

### Rest quality — bed vs. floor

Recovery rate = **posture base × support quality**, both from existing
substrate:

- **Posture base** comes from `Posed`: lying > sitting > standing >
  walking. `lie down` to recover faster is fully diegetic.
- **Support quality** is a new optional **`restQuality` field on the
  posture-bearing `SlotSpec`** (the furniture's lie/sit slot). This mirrors
  the encumbrance `coupling` field exactly — a second "what this slot does
  for the body occupying it" attribute, on the furniture slot universe
  rather than the body-plan one.

So:
- **Floor** = lying with no furniture slot → `restQuality` baseline (1.0);
  you recover at the posture rate.
- **Bed** = lying in the bed's lie-slot → baseline × the bed's
  `restQuality` (a bedroll 1.3×, a four-poster 2.5×, all authored on the
  slot).

The **surface** (`Surfaced`) is *not* involved — that's for placing
objects on a table; resting a body is posture-on-slot. **Sleep** is the
same machinery applied to the *logged-out* body — see "Presence, sleep,
and the in-session clock" below.

---

## Intake — `ingest`, the digestion buffer, overeating, vomiting

The verbs and portions already exist (bulkable/thermos): `sip` takes a
fixed small `SIP_LITRES`, `drink` a larger pull, and both hand
`{material, amount}` to the actor's **`ingest` seam — currently a no-op.**
Metabolism makes `ingest` real — and the honest shape of it answers
overeating, digestion-time, and vomiting all at once: **`ingest` fills a
digestion buffer (a stomach), not the reserve directly.**

- **`ingest` → digestion buffer.** A volume-capped store holding
  `{material, tags, amount}`. Food/water enter here; **digestion drains the
  buffer over time** (a time-flow, reconciled like the others) and **routes
  each tag to a pluggable target** — v1 registers the macro→reserve handlers
  (`water`→hydration, `sugar`/carb→fast satiation, fat→slow satiation); the
  **nutrient-ledger and toxin handlers slot in as the next phase**
  (the nutrients & toxicity layer — Phase 2, below) with no re-architecture,
  and magic-reserve/effect handlers further out. So recovery is **gradual**,
  not
  instant — eat *before* the march, not mid-haul. (Instant intake-to-reserve
  would be both dishonest and exploitable — gulp ten rations before a fight.)
- **Overeating falls out for free.** The cap is the *stomach volume*, not
  the reserve. You can't eat past a full stomach (distinct from `satiation`
  being full). No separate overeat mechanic needed.
- **`sip` vs `drink`** is **free** — the amount difference already flows
  through `ingest` into the buffer. Metabolism builds **no verbs**; it fills
  the seam the verbs already call.

**Per-consumable vs per-player.** The *amount/energy* a food yields is
**per-consumable** — authored on the `Material` (a stew yields more per
unit than water; that's `nutrients` density). Constant for the food. The
*rate* a body digests/recovers is a **universe dial in v1**, uniform across
players; per-individual variation, when earned, **derives from physiology**
(body mass, condition, species), never a stat (no "constitution").

**Vomiting** is the stomach's reject valve — see the toxicity section; the
buffer gives it the window.

What the buffer routes *into* — the nutrient ledger and the toxin
machinery — is **Phase 2** of this build (the next two sections). Phase 1
(the energy economy above) only registers the macro→reserve handlers.

---

## The cascade — floor-effects become conditions

The `floorEffect` strings were named to match **condition keys**, so the
cascade reuses the vitals condition *type system* rather than inventing
death logic. Metabolism **instantiates-on-floor / clears-on-recovery**, and
the condition is the diegetic label + the resolution hook.

> **Who drives it.** Vitals ships the condition *substrate* but **no live
> progression** (`Condition.ts`: "no live scheduler is built here") — like
> the reserves, which had no driver until encumbrance. So **metabolism is
> the first thing to *drive* conditions**, narrowly: while a reserve is
> floored, its own **lazy reconcile** accrues harm to vitals over elapsed
> in-session time (and clears it on recovery). It does **not** build a
> general condition scheduler — it drives only its own cascade (and, next
> phase, toxicity) conditions through the reconcile it already has.

- **`satiation` → 0 spawns `starvation`** — a condition that *progresses*
  (steadily degrades vitals → death via the death seam) and *resolves* when
  you eat. **Chronic, escalating.**
- **`hydration` → 0 spawns `dehydration`** — same shape, **faster**.
- **`endurance` → 0 spawns `collapse`** — different in character:
  **acute and reversible**, not progressing-to-death. You pass out from
  exhaustion and are incapacitated until endurance climbs back — which
  needs fuel.

**The death-spiral, grounded.** Collapse is the *handoff*: if you collapse
with fuel left, you recover; if you collapse because you're *also*
starving, you stay down and `starvation` becomes the actual killer.
Exhaustion (empty wallet) and starvation (empty tank) compound — can't
refill, basal keeps draining, vitals fail. Two failure modes that hand off
to each other, all physics, no special-case tuning.

---

## The time-drive — lazy on read, over *in-session* time

The time-based flows (basal, digestion, recovery) reconcile **lazily on
read**: when a reserve is read, apply the elapsed **metabolic time** since
a per-reserve timestamp. This is the proper home for exactly the
`WorldClock` time-source **cut from encumbrance** — it belongs at the
reserve/metabolism layer. Lazy-on-read handles off-screen bodies for free —
no per-NPC timers, no off-screen simulation; a body reconciles on
observation/interaction (a player's, continuously, via the cockpit's
reserve reads).

But the clock that drives it is **not raw wall-clock game-time** — see
below.

## Presence, sleep, and the in-session clock

**The metabolic clock advances only while the body is actively present.**
You get hungry from *playing* — a long expedition, sustained exertion — not
from being away from the keyboard. Real-life absence never starves you. So
the per-reserve timestamp accumulates **active-play time** and **freezes
when the body is absent**.

This is a deliberate spot where the **game-design fairness constraint
overrides the physics**: strictly a body metabolizes 24/7, but "don't
punish people for having lives" wins, and an in-session clock is the honest
way to honor it. (It also makes metabolism *more* fun — an in-session
challenge, never a chore your real schedule pays for.)

Three presence states:

- **Active play** → full metabolism: basal + activity + the recovery
  balance + digestion.
- **Linkdead** (involuntary — a dropped connection the player can't
  control) → **everything frozen.** Basal off, recovery off, digestion off.
  Reconnect *exactly* as you left. Keeping full live state is a player
  **positive** — it's *why* people prefer linkdead — and freezing
  metabolism is what stops an involuntary drop from meaning "reconnect
  starving." (The body is still in the world and still vulnerable for the
  connection layer's anti-grief window — you can't pull the plug to dodge a
  fight — but that's the connection layer's rule, not metabolism's.)
- **Voluntary logout = sleep** → basal still frozen (no starving from
  absence), but **recovery runs** — burning a little stored fuel to wake
  with endurance refilled, at the bed/inn `restQuality` rate. This is the
  reward for *choosing* to bed down; linkdead doesn't get it because you
  didn't choose to sleep. And because logout puts your body to sleep **in
  place** (no positional state lost), there's no reason to prefer the
  plug-pull when you're safe — proper logout-in-a-bed is strictly better
  (recovery + safety), which is the soft "find a bed before you sign off"
  pull, *incentivized, not forced.*

**The connection seam is two signals metabolism *receives*, never reaches
for:** *pause/resume the metabolic clock* (presence) and *enter/leave the
sleep recovery state* (deliberate logout). The connection/lifecycle
subsystem owns all linkdead policy — grace windows, vulnerability, the
eventual timeout-to-logout — and just drives those two flags. Metabolism
stays ignorant of disconnection mechanics. (This keeps sleep from
metastasizing into a connection-lifecycle rewrite — it's one hook.)

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
- **Macros route to the energy economy** (the Phase-1 handlers): `water` →
  hydration; `sugar`/carb → **fast** satiation; fat → **slow, dense**
  satiation (the expedition ration). **`protein` → tissue repair** — feeds
  the vitals *healing* rate, **not** stamina. But healing isn't a live
  driver (see below), so **protein→healing is a documented seam**: v1 tracks
  protein in the ledger; the heal-coupling lights up when healing is driven.
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

(Per-consumable *amount* vs per-player *rate* is settled above: amount on
the `Material`, rate a universe dial deriving from physiology later, never
a stat.)

## Phase 2 — Toxicity (what a bad meal *does*)

The mirror of nutrients: things the body is **harmed by**. Authored on
`Material.toxicity` (typed tags like `lead`, `iron-poisoning`).

- **Dose × potency → body burden → a poisoning condition.** A toxin tag
  carries a **potency**; harm = `amount × potency`, **per body mass** (a
  bigger body tolerates more — the `baseMass` signal again, no "poison
  resistance" stat). Ingesting adds dose to a **per-toxin body burden**;
  crossing a threshold spawns the named poisoning condition (driven by the
  metabolism reconcile — harm accrues while over threshold).
- **Two timescales.** *Acute* — one poisoned cup, immediate (no slow clock
  needed, unlike deficiencies). *Chronic accumulation* — `lead` clears
  slowly, so low-dose exposure (drinking from pewter, the lead-pipe
  classic) builds toward the threshold over time.
- **The vomit/purge window — the counterplay.** Toxins absorb *from the
  digestion buffer over time*, so there's a window: **`vomit`** (the one
  verb this build adds) expels stomach contents before absorption —
  involuntarily on gross overfullness or an acute toxin, or **induced**
  voluntarily to dump a poison you just swallowed. Timing matters.
- **Antidote → treatment** resolves the poisoning condition through the
  vitals treatment surface — a **seam** (resolution hook exists; confirm it's
  callable).
- Curated named toxins: spoiled food, venom, **alcohol** (the stress-test —
  simultaneously fuel + slight hydration + an intoxication toxin; *Dave's
  bar* runs on this), forageables (which berry/mushroom — ties to
  identification). Education: dose-makes-the-poison; lead plumbing; foraging.

> **Spoilage is a separate, deferred concern — not in this build.** Toxicity
> here *reads* a food's current toxicity; **spoilage** is what makes that
> value *dynamic* — a per-item freshness/age whose output over time is
> nutrients ↓ / toxicity ↑ / edibility → false. It's an **item** concern,
> not a body one, and the rate is **ambient-temperature-modulated**, so it's
> a **thermal-pass topic** ("perishability") that needs ambient temp to
> exist. It runs on **game-time, not the in-session clock** (food is a world
> object — it rots whether you're logged in or not; preservation — salt /
> smoke / cold storage — is the counterplay, and the economic payoff).
> Spoilage is the first instance of "materials change over time" (rust, rot,
> decay); only food has a live consumer, so general material-aging stays a
> seam. The toxicity socket already accommodates it — it just reads the
> current value.

---

## Demand-driven seams (model the live half, seam the rest)

The full metabolic equation has more inputs, but their drivers aren't
live, so they are **named seams**, not modeled now — the same discipline
encumbrance used:

- **Oxygen** (`spo2`) — the aerobic input to recovery. No breathing/
  drowning/altitude driver exists, so `spo2` never leaves baseline. Seam
  only; couples in when a breathing system drives it.
- **Temperature** (`coreTemperature`) — **two ports**: *heat out*
  (fuel-burn produces warmth) and *fuel/water in* (shivering burns fuel,
  sweating burns water). Both **resolve in the thermal design pass**
  (next, before any build); metabolism declares the sockets, thermal wires
  them.
- **Healing** (protein→repair) — the vitals heal rate isn't driven, so
  protein's repair routing is a tracked-but-inert seam (above).
- **Magic ingestion** — mana/`charge` reserve-refill draughts and custom
  effect-potions ride the *same* ingestion → buffer → routing pathway, with
  the payload landing in a magic reserve or a condition. **Deferred** behind
  Phase 2; the tag-routing socket is what keeps them cheap to add.

---

## The fun trap — **confirmed by measurement 2026-07-31**

> **The goal this section states is already met by the shipped constants.**
> Measured at 12×: basal hydration empties in **~4.6 real play-hours** and
> satiation in **~6.9** — a drink about **once every two sessions**, safely
> below notice. Meanwhile coupled recovery draws **~47× basal**, so the felt
> experience is set almost entirely by **exertion**, exactly as this section
> asks. Full numbers in [metabolism.md § Rates](../../subsystems/metabolism.md).
>
> Two consequences worth carrying forward:
>
> - **Tune the exertion end, not the basal end.** Basal is already invisible;
>   the whole curve lives in the recovery draw.
> - **Exertion-driven is also the honest model** — water is lost by sweating,
>   not by ticking — so the fun answer and the physical answer agree here.
>
> **What is still missing is the *point* of it.** "Carry water" is only a
> decision if there is somewhere water is scarce. The reframe: **ambient in
> civilization** (a fountain or tap makes drinking trivial and thoughtless) and
> **a real constraint on expedition** (the mine, the wilds, a frontier
> holding, a hot day). That turns hydration from a bar into a **packing
> decision**, and it
> makes thermal + weather genuine inputs rather than decoration.

## The fun trap

Hunger/thirst is the single most notoriously *un-fun* mechanic in games —
the "eat every five minutes" nag, the survival-tedium twin of inventory
tetris. The same principle that saves encumbrance saves this: **basal
rates tuned slow enough that normal play never makes you think about it**;
it bites only at the margins — long expeditions, deprivation, sustained
exertion. The fun is rationing and the exhaustion spiral on a hard
journey, **not** maintenance. Per game-stands-alone: metabolism is "on"
but gentle; survival-*as-challenge* is content/tuning, never a baseline
burden.

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

## Scope / dependencies / sequencing

**In — Phase 1 (the energy economy):** implement `ingest` → **digestion
buffer** (routes by tag to pluggable targets; macro→reserve handlers
registered) → satiation/hydration over time (overeating = stomach-volume
cap, free); basal drain (body-mass-scaled); coupled recovery (rate-limited,
posture-gated, both-tanks); the lazy reconcile on the **in-session metabolic
clock** (presence-gated: linkdead freezes all, voluntary-logout sleep runs
recovery only); `restQuality` on posture `SlotSpec`; floor-effects →
vitals conditions (`starvation`/`dehydration`/`collapse`), **driven by the
reconcile** (metabolism is the first condition-driver, narrowly);
gentle default rates. Connection seam = two received flags (pause/resume;
sleep).

**In — Phase 2 (nutrients & toxicity):** the open keyed **nutrient ledger**
(real-data-seeded) + macro differentiation; **curated deficiencies** (scurvy)
as reconcile-driven conditions; **toxicity** (potency × dose → per-toxin
body burden → poisoning condition; acute + chronic accumulation); the
**`vomit`** action + purge window (the one verb this build adds). Real food
catalog = a parallel content workstream.

**Seams (target machinery present, not driven — wire when it lands):**
protein → **healing** (vitals heal rate not driven); antidote → **treatment**
(resolution hook — confirm callable).

**Out (deferred):** oxygen/breathing coupling (no driver); thermoregulation
coupling (thermal — designed next); **magic ingestion** (mana draughts,
effect-potions — same pathway, magic-reserve/condition payloads);
per-individual metabolic rates; rich micronutrient *consequences* beyond the
curated few; all numeric tuning.

**Cut (not a mechanic, ever):** **waste material** — defecation/urination
as a reserve is the purest survival-tedium trap and nothing reads it. Food
mass is consumed *into the abstraction* (becomes satiation, leaves the
model); it does **not** track as body mass. Privies are diegetic *content*,
not a system.

**Depends on:** vitals (the **condition type system** — which this build is
the first to *drive*; death seam; the three reserves; the `Material`
nutrient/toxicity tags) — merged. Encumbrance (the discrete drain + the
body-mass signal) — the sibling build. Bulkable/`ingest` (intake) — the
thermos branch, in MR review. Posture (`Posed`/`Postured`) — shipped.

**Sequence:** vitals (done) → encumbrance → **metabolism**, with **thermal
designed before build** (to close the heat seam). Within this build: **Phase
1 (energy economy) → Phase 2 (nutrients & toxicity)**. Intake wants
`ingest`/bulk landed first; Phase 2's real food catalog is a parallel
content workstream.

---

## Open questions

- **Basal ∝ body mass exponent.** Structurally basal scales with body size
  (shared `baseMass` signal). Flat-per-mass vs Kleiber `mass^0.75` is a
  dial; default to something defensible, tune later.
- **Recovery's fuel/water split.** Recovery draws both tanks — in what
  ratio, and does low-one-tank throttle recovery proportionally or gate it?
  Tuning, but the *shape* (hydration the tighter leash) is decided.
- **Reconcile granularity over a gap with mixed activity.** Lazy reconcile
  assumes "rest" between exertion events (recovery accrues in the gaps;
  exertion is event-stamped). Confirm this integration is honest enough, or
  whether long gaps need bounding.
- **Digestion buffer magnitudes.** Stomach volume (the overeating cap) and
  the digestion conversion rate are dials; default defensibly. Open: does
  the buffer hold food and water in one volume, or two (you can drink when
  too-full-to-eat)? Lean two sub-capacities.
- **Where the flow logic lives.** The basal/recovery/digestion/ingest/
  cascade logic is reserve-level, cross-cutting — likely a `MetabolismApi`
  (or reserve-level methods), *not* on encumbrance. Settle at requirements/
  plan time. (No new module types for constants — they ride the owning Api.)
- **The presence flags' source.** Metabolism receives *pause/resume* and
  *sleep on/off* from the connection/lifecycle layer. Confirm that layer has
  (or gets) a clean linkdead-vs-voluntary-logout distinction to drive them;
  the messy linkdead policy stays there, not here.
- **Collapse's exact incapacitation.** `collapse` = unconscious? prone +
  can't-exert? Reuses the vitals consciousness/condition surface; pin the
  state when the cascade is wired.
- **(Phase 2) Nutrient ledger storage.** An open keyed vector seeded from
  real data — a `Reserved`-style keyed Record, or its own keyspace? Mirror
  the reserve substrate's decomposed-scalar persistence. And: is the ledger
  on every `Creature`, or only those that care (the don't-widen rule)?
- **(Phase 2) Real-nutrition-data pipeline.** Source (USDA FoodData
  Central?), the import/mapping to the nutrient keyspace, and how authored
  food templates carry profiles. A content/tooling workstream to scope
  separately.
- **(Phase 2) Toxin tag shape.** `Material.toxicity` is `string[]` today —
  it needs **potency** per tag (and a clear rate for accumulators). Extend
  the tag to `{type, potency}` or carry potency elsewhere; settle at plan
  time.

---

## Cross-references

- [reserve.md](../../subsystems/reserve.md) — the axis + floor-effects.
- [vitals.md](../../subsystems/vitals.md) — the condition system + death
  seam the cascade rides.
- [encumbrance-slate](./encumbrance-slate.md) — the discrete-exertion half;
  the `SlotSpec`-field pattern `restQuality` mirrors.
- [posture.md](../../subsystems/posture.md) — `Posed`/`Postured`; the rest
  gate.
- [bulkable-slate](../tails/bulkable-slate.md) — `sip`/`drink`/`ingest`,
  the intake mechanism.
- [thermal-slate](../tails/thermal-slate.md) — the heat seam, resolved in
  the thermal pass.
- [connection.md](../../subsystems/connection.md) — the linkdead/logout
  lifecycle that drives the two presence flags metabolism receives.
- [race.md](../../subsystems/race.md) — `Material.nutrients`/`toxicity`/
  `edibility`, the authored tags Phase 2 reads (the deferred `DietApi`'s
  real home).
