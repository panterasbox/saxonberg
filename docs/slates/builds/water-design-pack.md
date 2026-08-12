# Water design pack — physics everywhere, weather nowhere

> **Status: design, planner-ready, captured 2026-08-11. Not requirements.**
> Water was assumed to be a thin, unmodelled substance. **It is not** — it is
> one of the best-modelled substances in the game (Part 0). What it lacks is
> not physics but a **connection to the sky**, and the design call that follows
> is therefore much narrower and much cheaper than a "water utility" build.
> Same per-object format as the [room-condition](./room-condition-design-pack.md),
> [spoilage](./spoilage-design-pack.md) and [household](./household-design-pack.md)
> packs.

See also: [power-utility-slate](./power-utility-slate.md) (water is named there
as *"the obvious sibling — design once, instantiate per utility"*; this pack
**declines the billing half**) · [stewardship-doctrine § the recurring-charge
call](../../stewardship-doctrine.md) (**what may and may not recur**) ·
substrates that already carry water: [bulk](../../subsystems/bulk.md) ·
[metabolism](../../subsystems/metabolism.md) (the `hydration` reserve) ·
[mortality](../../subsystems/mortality.md) (dehydration) ·
[husbandry](../../subsystems/husbandry.md) + [smallholding](../../subsystems/smallholding.md)
(soil moisture, Liebig) · [fire](../../subsystems/fire.md) (`douse`, phase
change) · [weather](../../subsystems/weather.md) (⭐ **the missing edge**) ·
[room-condition](./room-condition-design-pack.md) (the cleaning half) ·
[disease-slate](./disease-slate.md) (⭐⭐ the contamination payoff).

---

## Part 0 — ⭐⭐⭐ The correction: water is not thin, it is unconnected

A substrate audit, because the assumption going in was wrong and the whole
shape of the work depends on it. **All of this ships today:**

| Layer | What ships |
|---|---|
| **Matter** | `/obj/material/bulk/water` as [bulk](../../subsystems/bulk.md) — a `{material, amount}` holder attribute, `fill`/`pour`/`drink` |
| **Body** | the `hydration` reserve; **"hydration is the tighter leash"** (costs more per point of endurance than satiation); `hydrationThrottle` on recovery; **dehydration is a death path** (mortality, 600 s) |
| **Plants** | soil `moisture` in **litres**, drained by summed `waterDemandPerGameDay()`, evapotranspiration × warmth, and `satWater` inside `min(satWater, satLight, satRoot, satNutrient)` — **Liebig's law, shipped** |
| **Fire** | water/`douse` as one of the three extinguishers; the wet-fuel `ΔT_wet = saturation × capacity% × L_vap / specificHeat`; **ice → water → steam** out of one phase-change model |
| **Environment** | `Wet.ts`, weather wetness, puddles |
| **Verbs & things** | `water` + `WateringCan` + `watering-can`, `waterskin`, the dorm **tap** and the Hinkley Hills **standpipe** (`UnboundedReceptacle`, ∞) |
| **Magic** | `conjure-water`, the `magic-water` Discipline |

> ⭐⭐⭐ **So the gap is not "water is unmodelled." It is that water has
> PHYSICS everywhere and WEATHER nowhere.** Drought is already fully
> implemented — `satWater` is a first-class limiting factor on every growing
> thing — and it **can never happen**, because the standpipe is infinite and
> *rain does not exist as far as the soil is concerned.*

[smallholding.md](../../subsystems/smallholding.md)'s own deferred-seams list
says it outright: **"Nothing fills the bed's moisture from the sky."** The
weather system ships. Wetness ships. Puddles ship. The bed holds a moisture
reserve measured in litres. Nothing joins them.

---

## Part 1 — ⭐⭐ The ∞ tap is a decision, not an oversight — keep it

Before proposing scarcity, note that the shipped seeds **already argued this
question and answered it**, in their own comments:

> *"An inexhaustible water source, so filling a watering can needs no
> errand… ∞ is the honest v1."* (the dorm tap)
>
> *"Without water on the lot, every single watering is a round trip into
> town, which turns the care loop from a habit into a chore."* (the Hinkley
> Hills standpipe)

That is the anti-treadmill doctrine, reached independently and **before the
doctrine existed**. It is right, and this pack does not disturb it.

It also settles the utility question the [power
slate](./power-utility-slate.md) parked. Under the [recurring-charge
call](../../stewardship-doctrine.md), metered *consumption* is admissible —
but admissible is not obligatory:

> ⭐⭐ **Domestic water stays free.** Household draw is trivial, the
> accounting would be noise, and metering it converts a habit into an errand
> for no gameplay. **We decline the billing half of the water utility** — not
> because doctrine forbids it, but because it buys nothing and costs the care
> loop its rhythm.

`UnboundedSourceMixin`'s docstring already names the **finite-but-regenerating**
source as its deferred variant. That is the right shape for a *well* or a
*cistern* when content wants one — a frontier lot without mains — and it is
content's call, never a global scarcity.

---

## Part 2 — ⭐⭐⭐ The call: scarcity comes from the SKY, not from a meter

> **Connect the rain to the soil. Leave the tap alone.**

This is the whole design, and it is close to free because both halves ship:

```
weather (rainfall, shipped)  →  CultivableMixin.moisture (litres, shipped)
```

Everything interesting follows from that one edge:

- **Drought becomes possible for the first time.** A dry spell stops being
  flavour text and starts binding `satWater`, which is *already* the limiting
  factor in the shipped Liebig min. **No new growth model** — the model has
  been waiting for an input.
- **Rain is generous, not punitive.** It fills your bed while you are away.
  The archetype-2 clock (*runs over absence*) is doing you a **favour** here,
  which is the pleasant inverse of how absence usually reads.
- **The counter is an act, always available.** Drought → walk out with the
  can. *Care is fought, never watched*, and the standpipe is the cheap exit
  that stops a dry season from ever becoming a treadmill.
- **The agricultural year acquires teeth**, which the fridge pack and the
  farming slate both want and neither can produce alone.

### ⚠ The Law-2 check, done explicitly

A dry spell degrading an unattended garden **runs over absence**, so it must
be checked rather than assumed clean. It passes, on grounds
[husbandry](../../subsystems/husbandry.md) already ratified:

> *"**A plant is not a body.** Owned things integrate the full absence… A
> player away three real days comes back to a plant that lived those three
> days."*

The clock started when **you chose to plant** — Law 2's *"you put it in
flux"* test — and consequence is asymptotic (a wilted bed recovers; it is not
deleted). Note also what the rain edge does to the balance: it makes absence
**less** punishing on average than the current model, where nothing waters
your bed but you.

---

## Part 3 — The utility layer is SUPPLY FAILURE, not billing

Having declined metering, what remains of "water as a utility" is the
[power slate](./power-utility-slate.md)'s **middle tier** — the supply-ref —
and it is the half worth having:

| State | Reads as | Rides |
|---|---|---|
| **Dry** | the main is cut, the source has failed | supply-ref (source state gates dependents) |
| **Frozen** | a winter tap that will not run | shipped `ThermalMixin` + phase change |
| ⭐⭐ **Contaminated** | it runs, and it makes you ill | [disease-slate](./disease-slate.md) |

These are **events**, not invoices. They give the linesman/water-worker
vocation somewhere to go (the [vocations](../../vocations.md) register lists
*water / sewer worker* as a **GAP**), and they use the delivery slate's
*"coverage is legal, connection is physical"* trick, so an outage is local and
directional rather than wholesale.

### ⭐⭐⭐ The contamination payoff: this is John Snow, and the corpus already reached for him

[room-condition](./room-condition-design-pack.md) Part 4 already cites
**Snow's cholera map** as its public-health pedagogy — but a map is only
possible because cholera came from **a shared water source**. The Broad Street
pump *is* the mechanism, and the game has every piece of it:

- water sources are **objects with identity** (the tap, the standpipe);
- disease has **routes and a growth term** (designed);
- removing the pump handle is **disabling a fixture** — a shipped shape.

> ⭐ **A contaminated shared source is the single best public-health teaching
> object available**, and it is the one epidemiological lesson that *cannot*
> be taught by per-home hygiene: the cause is **outside** any individual
> home, and finding it requires comparing cases across households. That is
> epidemiology as a **puzzle**, not a lecture — and it needs the
> [household](./household-design-pack.md) primitive to have households to
> compare.

---

## Part 4 — Cleaning needs water AVAILABLE, not SPENT

[room-condition](./room-condition-design-pack.md)'s care loop (`wash` /
`wipe` / `bathe`) currently assumes water from nowhere. The fix must not
reintroduce the errand Part 1 protects:

> ⭐⭐ **Water is a PRECONDITION on the room, not a consumable on the act.**
> Where there is a tap, `wash` simply works — zero friction, zero accounting.
> Where there is not, you need a filled vessel.

Two things fall out for nothing:

1. **The bathroom finally has a modelled function** — room-condition's own
   open question 2, answered: the tub/basin is *the fixture that makes `bathe`
   available*, which is a real function without a needs-bar.
2. ⭐ **"Running water" becomes a residence-ladder rung feature**, which is
   exactly how housing actually improved historically, and a far better
   distinction between rungs than a `prestige` number. A dorm has a corner
   tap; a frontier lot has a standpipe in the yard; the gap between them is
   *the errand*, and closing it is what buying a better place buys.

---

## Part 5 — Designed to the format

**1–2. What it is / composition.** One **new edge** (weather → soil moisture),
one **precondition read** (is water available here), and the **supply-ref**
instantiated for water. No new substance model — water's physics ships.

**3. New / updated surfaces.**

| | Work | State |
|---|---|---|
| ⭐⭐ **Rain → soil moisture** | weather rainfall fills `CultivableMixin.moisture` on sky-exposed ground (`SkyExposed` ships) | **new — the whole point, one edge** |
| ⭐ **Water-available precondition** | a room/extent read: is there a source or a filled vessel in reach | **new (derived, small)** |
| ✳ **Supply-ref for water** | dry / frozen / contaminated source states | **rides [power-utility](./power-utility-slate.md)'s middle tier** |
| ✳ **Contaminated → disease** | a source-borne route | **rides [disease](./disease-slate.md)** |
| ✳ **Finite-but-regenerating source** | the well/cistern variant | **already named in `UnboundedSourceMixin`; content's call** |
| ⛔ **Metering / billing** | — | **declined (Part 1)** |

**4. Verbs & affordances.** **No new verbs.** `fill` / `pour` / `drink` /
`water` / `douse` all ship; `wash` / `bathe` belong to room-condition. Water is
an *input and a condition*, never a new command surface.

**5. Persisted fields.** **None new.** Soil moisture, bulk amounts and wetness
all persist today; rainfall is derived from the stateless weather field;
availability is a read.

**6. Seams & dependencies.** Hard: **weather** (ships) + **smallholding**
(ships) for the rain edge — that half is **unblocked today**. The cleaning
precondition waits on room-condition; contamination waits on disease; the
supply-ref waits on the power slate's middle tier.

**7. Fault line.** ⭐ **The rain edge is a near-term build on two shipped
subsystems.** Everything else in this pack rides another build's timeline. If
only one thing here is ever done, it is the sky-to-soil edge.

> ⚠ **Amended 2026-08-11 — one design dependency, missed here.** *"Depends on
> nothing designed-but-unbuilt"* was wrong. Implementation hits a real seam:
> **husbandry is deliberately 100% synchronous** (`reconcileSoil` /
> `reconcileGrowth` / `waterPlant`, reconcile-on-read, no tick) while
> **resolving a bed's covering `Locality` is async** (`Zone.lookupField`).
> Passing `locality: null` is sync but wrong — every bed everywhere would get
> identical weather, so it could rain in Hinkley Hills while the bed there
> stayed dry, which is the exact incoherence this edge exists to fix.
>
> ✅ **Resolved by [supply-design-pack § Part 4](./supply-design-pack.md):
> cache the source's IDENTITY, derive its STATE.** Cache the locality (async,
> once, backlog-safe checkpoint); `weatherAt` is **pure and replayable**, so
> rainfall still integrates *exactly* across any absence. ⚠ And note what
> this rules out: crediting rain from weather's existing **segment-boundary
> schedule** would be a push-tick, and an evicted or dormant bed would
> silently miss rain with reconcile-on-read unable to know — breaking
> husbandry's *"integrates the full absence"* guarantee. Pull-on-read is not
> a preference here; it is the only correct shape.

---

## Part 6 — Pedagogy

- ⭐⭐ **The water cycle, as a mechanic you farm against.** Rain → soil →
  evapotranspiration → plant → atmosphere is *already* half-implemented; the
  rain edge closes the loop and makes it observable.
- ⭐⭐⭐ **Epidemiology as a puzzle** (Part 3) — the one public-health lesson
  that cannot be learned inside a single home.
- **Liebig's law made vivid.** A bed limited by water teaches *the binding
  constraint* better than any lecture, and the shipped `getLimitingFactor`
  read already names which one binds.
- **Infrastructure as invisible until it fails.** A tap that always works
  teaches nothing; a tap that is dry, frozen or foul teaches what plumbing
  *is* — which is also why Part 3 keeps failure and drops billing.

---

## Interop map

- **[Weather](../../subsystems/weather.md)** — the missing input; the
  stateless procedural field already produces rainfall.
- **[Smallholding](../../subsystems/smallholding.md) + [husbandry](../../subsystems/husbandry.md)**
  — the consumer; `moisture`, evapotranspiration and `satWater` all ship and
  are waiting.
- **[Room-condition](./room-condition-design-pack.md)** — the cleaning
  precondition; the bathroom's function; Snow's map gains its mechanism.
- **[Disease-slate](./disease-slate.md)** — the contamination route.
- **[Power-utility](./power-utility-slate.md)** — the shared supply-ref shape;
  *design once, instantiate per utility*, with billing declined here.
- **[Residence ladder](./residence-ladder-design-pack.md)** — running water as
  a rung feature.
- **[Vocations](../../vocations.md)** — *water / sewer worker* is a listed
  **GAP**; supply failure is what gives it work orders.
- **[Bulk](../../subsystems/bulk.md)** — the matter substrate, unchanged.

---

## Forks settled, and the blockers

**Settled:**

1. **Water is not thin** — it is unconnected. The work is one edge, not a
   substance model.
2. **Domestic water stays free**; the ∞ tap is a decision to keep, and the
   billing half of the water utility is **declined**.
3. **Scarcity comes from the sky** — rain → soil moisture, which makes the
   shipped Liebig model live.
4. **The utility layer is supply FAILURE** (dry / frozen / contaminated),
   never invoices.
5. **Cleaning needs water available, not spent** — a precondition, not a
   consumable.
6. **No new verbs, no new persisted fields.**

**Blockers:** none for the rain edge. The cleaning precondition waits on
room-condition; contamination on disease; the supply-ref on the power slate's
middle tier.

---

## Open questions

1. ✅ **How much rain, and over what interval? — ANSWERED 2026-08-11.** The
   worry (*"a stateless field sampled at two points is not the same as rain
   that fell between them"*) turns out not to bite: weather is
   **piecewise-constant per 6-game-hour segment**, and `weatherAt(t, locality)`
   is a **pure function of time**. So the integral is a segment walk over
   `[lastStamp, now]` summing `overlap × rate(type)` — **exact, not
   approximated**, and replayable over any absence. Litres come out with no
   invented field: rainfall in mm × the shipped `getLandRequirementM2()`, since
   1 mm over 1 m² is 1 L. **Rate per type is the one thing still to author** —
   `rain` and `storm` precipitate; ⚠ `snow` credits **zero** for v1, which is
   physically right (frozen ground does not infiltrate until melt) and honest
   while winter is unbuilt. ⚠ Long gaps want a segment cap.
2. **Does rain wet things other than soil?** `Wet.ts` and puddles ship; whether
   an uncovered item left outside gets wet is a separate (and cheap) edge.
   *Lean: yes, and it is a nice legibility win for `SkyExposed`.*
3. **Indoor vs sky-exposed** is `SkyExposed`, which ships — but a *pot on a
   windowsill* is neither, and the houseplant is the game's most-owned
   growing thing. Needs a ruling.
4. **Does contaminated water need a visible tell?** Cholera's whole lesson is
   that it did **not**. *Lean: no tell, and that IS the lesson* — but it
   argues for a `boil` counterplay so the knowledge is actionable once earned.
5. **Should a drought ever threaten drinking water?** *Lean: never for
   players* — dehydration is a shipped death path and gating it behind weather
   would be the treadmill this pack exists to avoid. Livestock and crops only.
