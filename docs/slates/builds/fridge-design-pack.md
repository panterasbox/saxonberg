# Fridge design pack — the cold-storage stack and the real-world mirror

> **Status: design, planner-ready, captured 2026-08-06. Not requirements.**
> Two jobs: (1) the **fridge** designed outright to a reusable per-object
> format, with every mixin it needs — **new or updated** — named; (2) the
> **real-world telemetry layer** its seams open, built on
> [mirror-slate](./mirror-slate.md), with the **kitchen as the mirror's
> second dense domain**.
>
> It does not choose the build boundaries — it exposes the **fault lines**
> (Part 7) so builds can be carved along them.

See also — substrate: [thermal](../../subsystems/thermal.md) (`ThermalMixin`,
`FurnaceMixin`, `AtmosphericMixin`, phase change) ·
[preservation-slate](./preservation-slate.md) (**spoilage — the reason a
fridge exists**) · [spoilage-design-pack](./spoilage-design-pack.md) (the
planner-ready spoilage spec) · [furnishing](../../subsystems/furnishing.md) (the
fridge is owned chattel placed in a room) · [boundary](../../subsystems/boundary.md)
(`Sealable`/`Switchable` — the door, the dial) ·
[power-utility-slate](./power-utility-slate.md) (the supply-ref the powered
fridge draws on) · [stewardship-doctrine](../../stewardship-doctrine.md) (the
three decay archetypes; the pillar). Real-world: [mirror-slate](./mirror-slate.md)
(the parity thesis — **density-not-verification, never-see-the-raw-feed,
absence-is-neutral, recognition-not-advantage**).

---

## Part 0 — The per-object design format (reusable for any new Stuff to mint)

Every new object gets designed to this shape, so the planner reads the same
seven fields each time:

1. **What it is, mechanically** — the one sentence of behavior, not flavor.
2. **Composition** — the mixin stack, marking each ✅ ship / ✳ update / ⭐ new.
3. **New or updated mixins** — the engine work, designed outright.
4. **Verbs & affordances** — content-owned (`commandContributions`), never core.
5. **Persisted fields** — what round-trips.
6. **Seams & dependencies** — what it needs to already exist to have a point.
7. **Fault line** — which build it falls into, and what it waits on.

The fridge below is the worked instance. The **icebox**, **cellar**, and
**jar** (Part 3) are the same seven fields, mostly sharing the fridge's answers.

---

## Part 1 — The fridge, designed outright

### 1. What it is

**A powered container that holds its interior atmosphere at a cold setpoint,
so its contents read cold, so their `Freshness` decays slowly.** Everything
else is composition.

> ⭐ The fridge is not a new mechanism — it is the **cold twin of the shipped
> `FurnaceMixin`** (which holds its scope toward a *hot* setpoint), placed on
> a container, drawing power to run.

### 2. Composition (the mixin stack)

```
Fridge  =  Powered( ClimateControl( Sealable( Atmospheric( Container(
             Surfaced( Detailed( Visible( Persistable( Chattel( Thing ))))))))))
```

| Layer | Role on the fridge | State |
|---|---|---|
| `Container` | holds discrete food items | ✅ ship |
| `Atmospheric` | the **interior climate** (temp + humidity) contents resolve against | ✳ **update — decouple from `Vessel`** (below) |
| `Sealable` | the **door**: closed → high-R barrier, cold held; open → collapses to the air term, warms | ✅ ship (the thermos uses it) |
| `ClimateControl` | drives the interior atmosphere **toward a held setpoint** while powered | ⭐ **new — generalize `FurnaceMixin`** |
| `Powered` | consumes premises power to run; unpowered → stops driving, drifts to ambient | ⭐ **new — appliance draw over the supply-ref** |
| `Surfaced` | you can set a thing on top (a plant, a magnet) — LOD-optional | ✅ ship |
| `Chattel` + `Persistable` | owned, persists with its owner via `place` | ✅ ship (furnishing) |
| `Detailed`/`Visible` | prose | ✅ ship |

Instanceable → lives in **`obj/`** (a `obj/appliance/` cluster once the
oven/AC/heater join it; flat `obj/Fridge.ts` until then). It is **content over
substrate** — no fridge-specific engine code beyond the two mixin items below.

### 3. New or updated mixins (the engine work)

**✳ Update #1 — `AtmosphericMixin` composes on a `Container`, not only a `Vessel`.**
Today the biome resolve-walk terminates on the first `AtmosphericMixin`
override innermost-outward, and that mixin rides `Location` and `Vessel`;
*"pure containers are skipped… a sealed jar must be a `Vessel`"*
(preservation-slate). A fridge holds **discrete items**, not bulk, so making it
a `Vessel` (a bulk-liquid host) is the wrong shape. The clean fix: **let
`AtmosphericMixin` ride any `Container`**, so a discrete-item container can
carry an interior climate its contents resolve against. This one update
unblocks the fridge, the icebox, the jar, and the cellar-chest — every "cold
box" is a `Container` with an atmosphere.
- *Risk to check:* the resolve-walk's container-skip is presumably a
  performance/correctness choice; confirm an atmospheric container doesn't
  reintroduce the cost the skip avoided. Likely fine — the walk already stops
  at the first override.

**⭐ New #2 — `ClimateControlMixin` (generalize `FurnaceMixin`).**
`FurnaceMixin` already *"heats the Meltables in its scope toward its held
temperature."* Generalize it on two axes: **direction** (heat *or* cool) and
**target** (the scope's **atmosphere**, via the `AtmosphericMixin` override,
not only Meltables). Then:
- a **fridge/AC** = a ClimateControl host with a *low* setpoint,
- an **oven/heater/furnace** = the same host with a *high* setpoint.
One mixin, one setpoint field, a direction that falls out of setpoint-vs-ambient.
While active it drives the interior atmosphere toward the setpoint; the
contents' `ThermalMixin` reads that cold on the next reconcile (containment-move
re-stamp already fires — thermal.md). Home: **`lib/thermal/`**, beside `Thermal`.

**⭐ New #3 — `PoweredMixin` (appliance draw over the supply-ref).**
The active fridge only holds its setpoint **while powered**. Model it as an
`Energized` fixture that declares a **supply-ref** (power-utility-slate's middle
tier: *"an `Energized` fixture may declare its source… the source's state gates
its dependents"*). Source down (outage, unplugged, unpaid) → `ClimateControl`
stops driving → interior drifts to ambient → **spoilage resumes.** The draw is
**metered** (the kWh the premises bill and the smart-meter twin both read).
- This is the seam that makes the fridge a **utility consumer** and a **civic
  energy signal** (Parts 4–5). Home: rides `lib/electricity/` + the
  power-utility supply-ref; the *draw accounting* is the new bit.

*(Tier note: the **icebox** — Part 3 — needs neither #2 nor #3. It is the
no-power version and ships first.)*

### 4. Verbs & affordances (content-owned)

| Verb | Rides | Effect | Real-world twin |
|---|---|---|---|
| `open` / `close` | `Sealable` | door barrier toggle; open leaks cold | **door sensor** |
| `put` / `get` | `Container` | stock / retrieve food | fridge inventory |
| `set` (the dial) | `Switchable`/adjustable setpoint | change the target temp | **thermostat setpoint** |
| `plug` / `unplug` (or `switch`) | `Switchable` + `Powered` | connect/cut supply | plug state |

All afforded by the fridge's own `commandContributions`, never a core mixin
(the furnishing/command-spec rule). No new *core* verb is minted.

### 5. Persisted fields

Interior **setpoint**; **seal** state (open/closed); the **supply-ref**; the
`AtmosphericMixin` override; standard chattel `place` + owner. Contents persist
by containment. Nothing exotic — the persistence spine already carries all of it.

### 6. Seams & dependencies

- ⛔ **Requires `Freshness` on food to have a point.** With no spoilage, the
  fridge preserves nothing and is a decorative box. **The fridge is downstream
  of the preservation build** (Part 2) — do not schedule it before spoilage.
- Requires **update #1** (atmospheric container) — shared with icebox/jar/cellar.
- The **powered** fridge requires **#2 + #3 + the power-utility supply-ref**
  (designed, not built).

### 7. Fault line

The fridge splits cleanly into a **passive** half (ships early, no power) and
an **active** half (waits on power-utility). See Part 7.

---

## Part 2 — The spoilage co-dependency (why the fridge needs it)

The fridge is the *counterplay* to a decay system; without the decay system it
does nothing. That system is **archetype 2** from the stewardship doctrine, and
[preservation-slate](./preservation-slate.md) + the [spoilage pack](./spoilage-design-pack.md)
design it: a **~120-line `FreshnessMixin`** (copying `Wet.ts`'s reconcile) on
perishables, **`ThermalMixin` composed on perishables** so food has a
temperature, a rate = `temperature × water-activity × a tabulated material
constant`, and a **freshness → `ptomaine` override rung** on the ingest path
(which already shadows the `Material` for bulk). Runs over absence (drop the
far-past guard — *"food is not a body"*), never deletes, banded not numeric.

**The fridge consumes exactly one output of that build: the food's temperature.**
Cold interior → cold food → slow `Freshness`. So the two are co-designed but
**separately buildable**: spoilage ships and works in open air (summer rots,
winter keeps); the fridge/icebox is the *tool that buys time*, added on top.

---

## Part 3 — The cold-storage stack beyond the fridge

The same substrate (update #1 + thermal) mints a whole shelf of objects, at
three power tiers — worth listing because the planner should build the
**substrate once** and get all of them:

| Object | Cold source | New mixins beyond #1 | Ships when |
|---|---|---|---|
| **Sealed jar / crock** | none — just seals air + slows wetness | — | with update #1 |
| **Cellar / cold room** | ambient (a below-grade room runs cold; winter free) | — (a `Location` atmosphere override) | with update #1 |
| ⭐ **Icebox** | a **block of ice** inside (a `ThermalMixin` cold mass; melts via shipped phase change) | **`CoolboxMixin`** — interior atmosphere tracks the **coldest contained thermal mass**, bounded by ambient (~40 lines) | passive tier |
| **Fridge / freezer** | **powered** setpoint | `ClimateControl` (#2) + `Powered` (#3) | active tier |

> ⭐ **The icebox is the sweet spot for a first ship.** No power, no
> power-utility dependency, and it *is a stewardship object by construction*:
> the ice melts (shipped), you replenish it (an act — plain `put`), forget and
> the food warms. It also **wakes the icehouse-keeper vocation** and the
> agricultural year (cold is free in winter, dear in summer) that
> preservation-slate derives. The `CoolboxMixin` is the only genuinely new
> code, and it is tiny.

---

## Part 3A — Physics & pedagogy (the honest model, per mixin)

Four mixins, **one physics domain** — heat transfer + energy conservation —
that together teach the whole science and history of refrigeration. The honesty
rule for all of them: **real units, real tabulated constants, behavior derived
from a law (not a lookup), the exam key computed by the sim's own reconcile,
effects as diegetic events, derived-on-read over world-time.**

- **`Atmospheric` — microclimate.** Temperature (K) + humidity as **water
  activity / RH** (the real spoilage driver, not "moistness: 0.5"). The biome
  resolve-walk *is* the honest nested-climate model. *Teaches* gradients — why
  the fridge is cold-**and-dry** (heat removal condenses water; freezer burn) vs
  the cellar cold-**and-humid**. *Wrong-about:* which store keeps a food best =
  its `(temp, water-activity)` against its spoilage curve.
- **`Coolbox` — passive cold via latent heat.** Interior ≈ ice temp until
  `(m·L_fusion)/(ΔT/R)` elapses; composes the **shipped** Meltable plateau +
  Newton cooling. *Teaches* latent heat of fusion — *a block of ice absorbs as
  much heat melting as warming that mass of water ~80 °C*, which is **why ice
  works and a jug of cold water doesn't** — plus the icehouse and the
  **labor-for-energy substitution** the electric fridge made. *Item:* "4 kg
  block, walls R, 24 °C kitchen — hours to melt?" key = run the reconcile.
- **`ClimateControl` — the heat pump (the crown jewel).** Holds setpoint by
  pumping the leak `Q̇ = ΔT/R`; the electrical work that costs is `Q̇ / COP`,
  with COP bounded by Carnot `T_c/(T_h − T_c)`. Setpoint above ambient → it
  *adds* heat (`depositHeat`, shipped) → **oven/heater**, same mixin. *Teaches*
  the second law, heat pumps, COP, **insulation ↔ bill (derivable)**, and the
  COP->1 "a heat pump heats with more heat out than electricity in" fact.
  *Item:* "4 °C in a 22 °C kitchen, R, COP 3 — daily kWh?"; harder: "same fridge
  in a 35 °C garage — how much more?" (leak up **and** COP down — two effects).
- **`Powered` — power/energy/bill/grid.** `P = V·I` (Ohm's-law world, honoring
  the grid's *"one law, two scales"*), the current set by the thermodynamic
  demand; `E = ∫P dt` (kWh) reconcile-on-read, **running over absence** (a world
  process, like the food it cools — archetype 2, not presence-frozen); bill =
  `E × rate` (a banking transfer, never a mint). *Teaches* power-vs-energy
  (watts vs watt-hours), **duty cycle** (average draw is leak/COP, not the
  nameplate), standby, demand/peak. *Item:* "100 W × 10 h vs 1 kW × 1 h?" (equal);
  and the deep one — "8 h outage in a 30 °C heatwave — does the fridge's food
  cross into the ptomaine band?" (chains Powered→ClimateControl-off→thermal-
  drift→Freshness→ptomaine, a multi-system computed key).

> ⚠ **The COP fork — settle before build.** Is COP **Carnot-derived** (a fixed
> irreversibility fraction of `T_c/(T_h−T_c)`, so it moves honestly with the
> lift) or **tabulated per device** (a real appliance spec)? *Lean:
> Carnot-fraction* — one honest number gives the right behavior everywhere and
> stays derivable; a per-device table is a lookup that drifts. It is the **one
> genuinely new physical quantity** the whole pack introduces.

> ⭐ **The payoff:** the same `insulation ↔ energy-bill` equation a student is
> graded on is exactly what the real-world mirror (Part 4) reads off a smart
> meter. **The honest model *is* the education↔stewardship↔mirror bridge** —
> you don't learn a game-thing and separately own a real-thing; it is one
> equation.

---

## Part 3B — Interoperation (how these mixins touch the existing world)

The governing principle, and it is the codebase's unified-physics bar: **the
fridge introduces no special cases. It composes existing mixins, holds a *real*
cold, and every other system reacts through its own honest model — none of them
knows "a fridge" exists.**

- **Thermal (native) — the fridge is a *restamp source*.** ClimateControl *is*
  generalized `FurnaceMixin`; Coolbox composes `Meltable`+`Thermal`; contents
  read the interior via the biome walk. Putting food in (`onMoved`), opening the
  door (`Sealable` seal-toggle), the ice melting, the compressor cycling all
  fire the **restamp seam thermal already ships** for the thermos. No new
  plumbing.
- **⭐ The same cold, three reactions.** The cold is *real*, so with one
  mechanism and zero fridge-awareness: **food** slows its `Freshness`; a **body**
  in a walk-in freezer cold-stresses via `ThermalRegulation`→`hypothermia`
  (vitals); **basil in the fridge dies** (husbandry's min-of-four reads the cold
  as a limiting factor). Three subsystems, one temperature.
- **⭐ ClimateControl is the whole kitchen.** Cold twin → fridge/AC; hot twin →
  oven/range, which plugs into **crafting's heat-gated cooking**
  (`requiresHeatK` / `reachableHeatFor`). One appliance mixin, both halves of the
  kitchen (and it retro-covers the forge).
- **⭐ The energy cost is an emergent cross-system chain.** biome/season → room
  ambient → the lift ΔT → ClimateControl work → Powered draw → the parcel bill
  (banking) → the civic energy signal (civics/mirror). *"Costs more in summer"*
  is authored nowhere — and that chain *is* the mirror's real-world signal path.
- **Metabolism + bulk (the payoff and the reach).** `Freshness`→`ptomaine` rides
  the ingest toxicity-override rung (per-instance via `BulkPayload`); eating
  spoiled fridge-food → toxin burden → food poisoning, gated on the
  **Condition-live** prerequisite (doctrine Part 6). The `Atmospheric`-on-
  `Container` update lets the fridge hold discrete food **and** bulk vessels
  (a milk jug), both cold, both spoilable through the same rung.
- **⚠ Persistence (the subtle one, with teeth).** The fridge + food + their
  `Freshness`/temperature state must survive dorm/reap. On materialize the
  reconcile integrates the offline gap **at the cold rate — iff the atmosphere
  is restored before the contents' reconcile reads it** (furnishing's
  fixtures-then-overlay ordering; the "plant keeps its growth" precedent). That
  is what makes *"my food's still good after a week away — the fridge kept
  running"* true. It forces one real ripple: a **dormant fridge keeps drawing
  power** (the reconcile accrues it over absence), so a mid-dormancy supply cut
  means the **power-utility supply-ref needs state-over-time, not just
  on/off-now.**
- **Boundary / electricity — emergent hazard.** Door = `Sealable`, dial/switch =
  `Switchable`, power = `Energized` + the supply-ref. A plugged-in fridge in a
  flooded kitchen is a node in the conduction graph and **shocks you, for free**
  (the FloodedCell physics).
- **Crafting wear (a stewardship loop).** The appliance is a `Durable` good — it
  wears, a broken fridge stops cooling → food spoils, so **appliance maintenance
  is a home-stewardship loop** (repair; the armorer-as-career maintenance-
  relationship). `Grade` ties to the physics — a better-made fridge is
  better-insulated (higher R) → lower bill.
- **⭐ No scheduler load.** Everything is reconcile-on-read (the
  thermal/metabolism/husbandry family), so a fridge that is "always running"
  adds **zero** push-tick/scheduler cost — residency and activity untouched. The
  honest model is also the cheap one.

---

## Part 4 — The real-world mirror layer (the fridge's seams have twins)

The fridge is the mirror-slate thesis with a **second dense domain**. Every
seam Part 1 designed is *already* an ordinary home sensor:

| Fridge seam (in-game) | Real derived signal | In-game quantity it may drive |
|---|---|---|
| interior setpoint / temp (`ClimateControl`) | avg fridge temp today; setpoint | food `Freshness` rate; appliance condition |
| power draw (`Powered`) | kWh today (smart meter / smart plug) | premises energy; the utility bill; **the civic energy signal** (Part 5) |
| door open/close (`Sealable`) | door-open-minutes (fridge door sensor) | a stewardship micro-signal (waste from leaving it open) |
| contents + expiry (`Freshness`) | items expired this week (smart fridge / manual scan) | food waste; the grocery ledger |

**Everything the mirror-slate ruled, applied here — verbatim, not re-litigated:**

- **Density, not verification.** The kitchen is *self-constraining*: fake "no
  waste" and it contradicts the grocery ledger, the door log, the energy draw.
  ⭐ **The kitchen is the mirror's second dense cheap domain after the bedroom**
  — and the one that carries **energy**, which the bedroom does not.
- **The platform never sees the raw feed** (invariant). The fridge twin ingests
  *"avg interior temp,"* *"kWh today,"* *"door-open-minutes,"* *"items expired"*
  — derived on the player's own hardware (Home Assistant / the smart-home hub),
  never a stream, never a camera. This is an **architecture constraint**, not a
  privacy setting: design the ingest to accept only pre-derived assertions.
- **Absence is neutral; the mirror only ever adds.** No sensor → no penalty,
  and the game is complete for a player with zero instrumentation. (This is
  "presence is never the meter" wearing a thermostat.)
- **Recognition, not advantage.** Real energy savings earn **standing /
  stewardship competence / a civic renown** — the *same* thing in-game
  stewardship earns — **never** currency, never a multiplier, never in-game
  power. Otherwise the sensors (which cost money) are pay-to-win.
- **Claim until corroborated; condition, not character.** A single reading is a
  *claim* (chronicle's deed/claim split); density corroborates. Real readings
  drive **property condition** and **stewardship competence**, never traits,
  alignment, or character (the INTRINSIC/SOCIAL firewall).

**The one thing the fridge/kitchen adds to mirror-slate that the bedroom
couldn't:** the mirror stops being purely about *personal* condition and starts
touching **externalities** — energy is consumed from a shared grid; that is the
bridge to Part 5.

---

## Part 5 — ⚠ The civic extension: "a better resident" (powerful, and the most fraught)

You named it exactly: *noise, energy consumption, land use* — all modeled
in-game, all **externalities** that fall on neighbors. The mirror can reward
being a **good community member**, not just a good homeowner. This is the
highest-value and **highest-risk** part of the whole idea, because it is one
wrong turn from a social-credit system. The design has to be built around that
risk, not bolted with a disclaimer.

**The safe shape, and why it is safe:**

1. **Real acts drive *fictional* civic standing.** The Compact is an invented
   government. Real quiet-hours compliance / energy conservation / proper land
   use maps to **standing in the fiction** — it *teaches and rewards* civic
   virtue (the education thesis again) **without being a real-world enforcement
   or reporting mechanism.** Nothing ever leaves for a real authority.
2. **Positive-only, and aggregate over individual.** The mirror **adds** for
   contribution; it never **subtracts** for a neighbor's behavior, and it never
   **ranks residents against each other.** The civic payout is against
   **anonymized aggregate goals** ("the block cut evening peak load 12%"), not a
   leaderboard of who ran their AC. Ranking neighbors is the line that must
   never be crossed.
3. **Opt-in, per-signal, revocable, derived-only** — the Part 4 invariants,
   unchanged. Energy-total-yes, occupancy-no is a valid config.
4. **Never the meter.** Real civic behavior is never *required* to hold standing
   — absence is neutral here too. It only ever adds recognition.

> **The framing that keeps it humane:** the mirror is a **practicum for
> citizenship**, not a surveillance layer. Real stewardship earns fictional
> standing that *reflects* it — the same closed loop as the education vertical
> (real learning → in-fiction credential), pointed at civic virtue. Schell's
> dystopia was gamification *as* surveillance; this is the opposite by
> construction, because the reward is recognition in a game, the data never
> leaves your hardware, and not playing costs nothing.

⚠ **This section needs its own careful pass before any build** — the guardrails
above are the spec, and getting the aggregate-not-individual and
positive-only-lines exactly right is the whole job. Flagged, not designed to
completion here.

---

## Part 6 — The partner surface (bracketed, like education's real-dollar layer)

The mirror has a real business layer that must stay **separate from the game
economy** (the education firewall, again: real money never buys in-game
advantage). Named so it is not forgotten, not designed here:

- **Utilities** — conservation programs already gamify demand-response
  (OPower-style); a stewardship mirror is a warmer front-end, and utilities
  *pay* for peak reduction.
- **Insurers** — leak/smoke/freeze sensors already earn premium discounts; the
  mirror is a natural home for the "you're covered because you steward" loop.
- **Smart-home platforms** — Home Assistant / Matter / Google/Apple Home are the
  **derivation layer** that computes the assertions so the raw feed never
  crosses (Part 4's invariant depends on them existing).
- **Municipalities** — the utility-mandate trend (smart meters, water) is the
  density mirror-slate is betting on arriving.

Same rule as the college slate: a real partnership entitles a real service; it
**never** buys in-game power.

---

## Part 7 — Fault lines (for carving builds when you're home)

The whole area splits along **power** and **inbound-channel** seams. Six pieces,
with their dependency edges:

```
[1] Spoilage core             (Freshness + Thermal-on-food + ptomaine rung + salt)
      |
      v
[2] Cold-container substrate  --> [3] Icebox object   (passive; no power)
    (Atmospheric-on-Container
     + CoolboxMixin)
      |
      v
[4] Active climate control    --> [5] Fridge/freezer object   (waits on power-utility)
    (ClimateControl gen. + Powered + supply-ref)
      |
      v
[6] The mirror inbound channel   (waits on the instrumentation slate; mirror-slate)
```

- **[1] Spoilage core** — the keystone; independent of every object here. Build
  first (it's the archetype-2 producer the whole pillar needs). See the
  [spoilage pack](./spoilage-design-pack.md).
- **[2] Cold-container substrate** — update #1 + `CoolboxMixin`. Unblocks jar,
  cellar, **icebox**. No power. The cheapest cold-storage win.
- **[3] Icebox** — content over [1]+[2]. **The recommended first shippable
  fridge-family object.**
- **[4] Active climate control** — `ClimateControl` generalization + `Powered` +
  the power-utility supply-ref. This is the *appliance-power* build; it also
  unblocks the **oven/heater/AC** (same mixin), so it is bigger than "the
  fridge" and should be scoped as the appliance/energy build.
- **[5] Fridge/freezer** — content over [1]+[2]+[4].
- **[6] The mirror inbound channel** — its own build entirely, gated on the
  **unwritten instrumentation slate** (mirror-slate's most load-bearing missing
  sibling). The fridge/kitchen is its second exemplar domain; capture
  instrumentation before building this.

**The natural sequencing:** spoilage → cold-container/icebox (early, cheap,
no-power) → *[power-utility lands]* → appliance/energy + fridge → *[instrumentation
lands]* → the mirror. The passive half is a self-contained near-term build; the
active + mirror halves wait on two designed-but-unbuilt substrates.

---

## Open questions / forks

1. **Icebox vs fridge first.** *Lean: icebox.* It ships without power-utility,
   proves update #1 + the cold→Freshness loop, and is a stewardship object by
   construction. The powered fridge waits on the appliance/energy build anyway.
2. **`ClimateControl` scope — atmosphere only, or Meltables too?** Generalizing
   `FurnaceMixin` must keep its Meltable-heating behavior (the forge) while
   adding atmosphere-driving (the fridge/oven). Confirm one mixin serves both
   without special-casing.
3. **Does `AtmosphericMixin`-on-`Container` reintroduce the walk cost the
   container-skip avoids?** The load-bearing verification for update #1.
4. **Diegetic or meta for the mirror?** (mirror-slate's open Q.) Is the fridge
   twin an in-fiction instrument the character owns, or a marked out-of-fiction
   channel? *Lean: marked meta* — the player has a smart home, the character
   does not.
5. **The civic aggregate threshold** (Part 5). The exact line between
   "anonymized block-level goal" and "individually legible," which is the
   difference between a citizenship practicum and a social-credit score.
6. **The density minimum for the kitchen** (mirror-slate's unquantified
   threshold, per domain). How many of the four kitchen signals before a payout
   is safe from faking.
