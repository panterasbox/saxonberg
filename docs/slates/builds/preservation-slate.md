# Preservation slate — spoilage, the counterplay, and the agricultural year

> **Status: design captured 2026-07-31, not built.** The **keystone deferral**
> of the extraction family. Spoilage is the mechanism; **preservation is the
> endeavor** — and the endeavor is what four other verticals are already waiting
> on.
>
> Two slates point at this and stop: [mining](./mining-slate.md) has
> **"Salt — the essential staple [DECIDED] … Preservation is the killer app"**,
> and [fishing](./fishing-slate.md) names itself *"the natural driver to finally
> build perishability."* Neither can complete without it.
>
> **It is already Law-2-legal**, by a carve-out the economy slate wrote before
> anyone asked: *"Things-in-flux degrade because you put them in flux… cut
> flowers wilt, **perishables spoil**. Active states you chose, not background
> bills."*

See also — the chain: [fishing](./fishing-slate.md) (the driver) ·
[mining](./mining-slate.md) (**salt** — the counterplay and a taxed staple) ·
[farming](./farming-slate.md) (winter is meaningless without this) ·
[ranching](./ranching-slate.md) (meat + dairy) ·
[crafting](../tails/crafting-slate.md) (the preserving branch) ·
[economy](./economy-slate.md) (**Law 2** — read it first) ·
[disease](./disease-slate.md) (**the same equation** — see below). Substrates:
[metabolism.md](../../subsystems/metabolism.md) (the toxicity socket
+ `ptomaine`) · [weather.md](../../subsystems/weather.md) (**the wetness
  gauge**) · [thermal.md](../../subsystems/thermal.md) ·
  [biome.md](../../subsystems/biome.md) (**the atmosphere walk — temperature
  *and humidity***) ·
  [materials-response.md](../../subsystems/materials-response.md) (the pre-named
  `corrosion` channel) · [crafting.md](../../subsystems/crafting.md)
  (`Durable`/`Keen` — the two-axis precedent). Prior sketch:
  [metabolism-slate](../tails/metabolism-slate.md).

---

## Law 2, and the line this must not cross

[Economy](./economy-slate.md)'s **Law 2 — *never tax absence; never demand
scheduled maintenance*** — is explicitly the lesson "learned from the
survival-MMO upkeep treadmill that drives players out." Its own summary line:

> **Use consumes. Neglect-of-things-in-flux degrades. Mere ownership and absence
> cost nothing.**

Any decay design has to clear that, and this one does, for a specific reason:

> ### The clock starts at an **act**, never at ownership.
> An unharvested crop is not spoiling. A **caught** fish is. Harvest, kill,
> catch, butcher, cook — each starts a clock on a thing that had none. That is
> exactly Law 2's *"you put it in flux"* test.

### Correcting an inherited framing — but carefully

[metabolism-slate](../tails/metabolism-slate.md) calls spoilage *"the first
instance of 'materials change over time' (rust, rot, decay)."* **Do not inherit
that as licence for general material aging.** Law 2 is explicit the other way:
*"Tools wear with **use**, not with the clock… treasured / authored / carried
things don't decay."*

But it is **not flatly banned** either, and the precise position is worth
getting right:

- **Rust-on-idle-gear is banned** — a blade in your pack must never degrade
  because time passed.
- **Environmental decay is a pre-named seam.** `Channel.ts` already announces
  `crush`, `cold`, and **`corrosion` (environmental)** as channels that "join
  when their consumer lands," and
  [materials-response-slate](../deferred-rpg/materials-response-slate.md)
  specifies it as **opt-in per `material × medium`, off by default**.

> **So: food spoils; gear does not rust in your pack; and a `corrosion` channel
> may later handle *iron left in brine* as an opt-in, default-off case.** Those
> are compatible. This build should ship **only the food axis** and not touch
> the channel.

*(Sideways benefit: this also retro-justifies the family clock. A herd losing
condition while you're away is not "taxing absence" — owning livestock is an
opted-into **active state**, and the automation ladder makes absence mitigable
by **wages**, which is activity. See [ranching § The
clock](./ranching-slate.md).)*

---

## The mechanism — spoilage is disease without transmission

Food spoilage **is** microbial growth. So it is the same equation
[disease-slate](./disease-slate.md) already specified, minus the hard half:

```
disease:   dLoad/dt = growth·load·(1−load/K)·f(host resistance) − clearance
spoilage:  dLoad/dt = growth·load·(1−load/K)·f(temperature, water activity)
```

> **Spoilage is the ideal *first* consumer of the growth term.** It needs no
> `ContagionSpec`, no host range, no immunity, no room-to-room push tick — none
> of disease's genuinely hard parts. **Build the growth term here, prove it on a
> fish, and disease inherits it working.**

That usefully reverses an assumption: disease-slate proposed crops as its first
proof, but **preservation is a cheaper proof of the same machinery** and
unblocks more.

### It is a *third wear axis*, not a new concept

The best structural precedent is already in `lib/material/`:

| Axis | Cadence | Driver | Bands | Restored by |
|---|---|---|---|---|
| **`Durable`** (`condition`) | slow, structural | **use** | `isBroken()` only | `repair` |
| **`Keen`** (edge) | fast, surface | **use** | `keen/serviceable/dulled/blunted` | `sharpen` |
| **freshness** *(new)* | own cadence | **environment** | its own band words | never — only slowed |

Same host pattern, its own cadence, its own band vocabulary. **A ~120-line mixin
in `lib/material/`, copying `Wet.ts`'s reconcile skeleton**, is the shape the
codebase is asking for.

---

## What the drivers actually cost **[corrected]**

Two drivers, and they are **not** equally free:

| Driver | State | Reality |
|---|---|---|
| **Water activity** | **`WetMixin`** — per-object saturation, banded `dry/damp/wet/soaked`, **composed on every `Thing`/`Vessel`/`Agent`** | ✅ **free — already universal** |
| **Ambient humidity** | an **already-resolvable field** on `AtmosphericMixin`, alongside temperature and pressure | ✅ free |
| **Temperature** | `ThermalMixin` is **opt-in and narrowly composed** (~11 classes: forge, kiln, flask, campfire, creature…). **A sack of grain has no temperature at all.** | ⚠ **not free** |

**The temperature gap is the real cost of this build.** Two routes, and the
cheap one is idiomatic: **compose `ThermalMixin` on perishables**, paying four
persisted fields plus an `onMoved` async restamp, and get cached ambient free on
every read. The alternative — calling `BiomeApi.resolveTemperatureFor` directly
— is **async**, and an async spoilage read path is exactly what thermal's
cached-ambient design exists to avoid. *Do not fight it.*

### The material number must be a real quantity

weather.md states the pattern: *"the mixin holds the per-object **state**, the
Material supplies the **physics number**"* — as thermal reads `specificHeat`,
electricity reads `electricalConductivity`, and wetness reads
`waterAbsorptionCapacity` (a real `Quantity<'%'>`, ASTM D570).

> ⚠ **Not `perishability: 0.7`.** `Material`'s header records that fake
> normalised 0–1 scales were **removed on principle**. The new field must be a
> **real tabulated quantity** — a shelf-life time constant in seconds, or an
> activation energy. Fish fast, grain slow, salt never, as physics rather than a
> designer dial.

### Two behaviours come free

- **"Shelter dries faster" already emerges** — a sheltered object gets no
  wetness accrual push, so the drain wins. **Storing food indoors already
  helps.**
- **A cold cellar is authorable today** — `AtmosphericMixin` (on `Location`
  *and* `Vessel`) carries per-field temperature and humidity overrides, and
  `BiomeApi.resolve*For` walks innermost-container-outward with the **first
  override terminating**. Thermal already reads through it.
  - ⚠ **Correction:** `SealedCellar` is **not** this precedent despite the name
    — it is 16 lines of `ReservedMixin(CartesianLocation)` holding a
    combustion-air budget for the CO demo. The precedent is `AtmosphericMixin` +
    `Vessel`.
  - ⚠ **Pure containers are skipped by the walk.** A box or chest does **not**
    modify its contents' environment. **A sealed jar must be a `Vessel`** (which
    composes `AtmosphericMixin`) — that is the sanctioned route.

---

## The counterplay

Every real preservation method is a **rate reducer**:

| Method | What it really does | Rides | State |
|---|---|---|---|
| **Salting / curing** | lowers water activity | **salt** ([mining](./mining-slate.md)) | ⚠ **salt does not exist as a solid Material** — only `bulk/salt-water`, authored for the shock demo |
| **Drying** | lowers water activity | the wetness gauge | ✅ already simulated |
| **Cold storage** | lowers temperature | the atmosphere walk | ✅ authorable today |
| **Smoking** | antimicrobials + drying | `smoke` is already an atmosphere tag with a shipped contaminant loop | mostly there |
| **Sealing** | excludes air | `SealableMixin` + `Vessel` | binary today, no physics |
| **Fermenting / pickling** | acidity | a crafting branch | ABSENT |

> ### Preservation lowers the rate. It never stops the clock. Nothing keeps
> forever — the same asymptotic-and-forgiving shape the rest of the family runs
> on. Preserved goods must be **durable enough to ignore** without being
> eternal.

**No preservation craft exists.** The three branches are bar, smithing, and
cooking, and cooking is entirely **heat-gated** (`requiresHeatK`). There is no
time-gated, salt-gated, or airflow-gated recipe anywhere. But the shape is
available: `outputApplication: 'tangible'` **flows the input's Material and mass
onto the cloned output**, which is exactly the *fresh → cured* material swap a
curing recipe wants.

---

## The agricultural year falls out **[the best consequence]**

Because the rate is temperature-modulated and temperature is seasonal, the year
organises itself with nothing scripted:

| Season | Production | Keeping |
|---|---|---|
| **Spring–Summer** | high | **poor** — warm means fast spoilage |
| **Autumn** | the harvest | the **preserving** season — the year's busiest work |
| **Winter** | none | **excellent** — cold is free refrigeration |

> **Summer produces but does not keep. Winter keeps but does not produce.
> Preservation is the bridge, and autumn is when you build it.**

Emergent rather than authored — the inversion falls out of a temperature-driven
rate against [farming § Winter](./farming-slate.md)'s 7.5-real-day, globally
synchronised season.

**It also solves the fridge problem.** If cold storage were cheap year-round,
everyone digs a cellar and spoilage is over. But a cellar is nearly free in
winter and dear in summer — the pressure inverts exactly when it must.

---

## Spoilage creates the geography of trade

> **Without spoilage, distance is only travel time. With it, perishable goods
> have a *range*, and preserved goods can cross it.**

That is why salt cod existed — and both [mining](./mining-slate.md) and
[fishing](./fishing-slate.md) already name the salt-cod route as their
interlock. Preservation converts a map into a **trade geography**: local markets
for the fresh, long routes for the cured, and a real industry sitting between
them.

---

## Salt is the keystone commodity

Mining has already **DECIDED** it, and its reasoning runs past food:

- **Preservation is the killer app** — "before refrigeration, salt is how food
  *keeps* → the enabler of the food economy."
- **A bodily need** — electrolytes, "universal constant demand." A second,
  independent demand source metabolism can carry.
- **Money-adjacent and taxed** — *"salary" = salt*, the **gabelle**, a house or
  corpo **monopoly**; "a natural state-revenue lever."

> Spoilage does not merely unblock a crafting branch. It **activates a commodity
> designed to be a governance and taxation lever** — handing the polity-paper
> engine something real to tax and the corpos something real to corner.

---

## What is blocked today

| Without spoilage | Consequence |
|---|---|
| **Winter** | a *pause*, not an economy — nothing rewards having stored well |
| **Salt** | a rock; mining's decided staple has no function (and no Material row) |
| **The salt-cod route** | decorative |
| **The preserving crafting branch** | no reason to exist |
| **Fishing's stated driver** | unrealised |
| **Ranching's meat + dairy** | no time pressure at all |
| **Post-harvest timing** | irrelevant |
| **The Victuallers** | lose the urgency their trade runs on |

**One deferral, eight consequences.** That is the argument for doing it early
and small.

---

## Keeping it un-miserable

1. **Only food spoils.** Not tools, not gear, not treasures — Law 2 forbids
   those. Small blast radius **on principle**, not by scoping convenience.
2. **Preserved is stable enough to ignore.** Once cured, effectively fine. That
   is the *reward* and must feel like one.
3. **Never deletion.** Degrade toward hazardous, never toward vanished.
4. **Legible, banded, never a number** — the house idiom wetness already uses.

### Do NOT drop `Grade` **[DECIDED]**

An early draft asked whether a stamped `Grade` should erode. **It should not.**
`Grade` and `condition` are deliberately orthogonal —
`MaterialApi.gradeConditionScale` is grade × condition, tuned so "a masterwork
at ~50% condition ≈ a common piece pristine." **Grade is the maker's verdict;
condition is entropy.** Eroding Grade collapses the two and damages the
maker's-mark and provenance thesis.

> **Freshness is a third gauge, not a Grade decrement.** (`setGrade` is public
> and unguarded, so nothing *prevents* it — this is a discipline, not a wall.)

---

## Two divergences from the copied skeleton

The four object-side reconcilers share a skeleton worth copying — but **two of
its guards must not be inherited**:

1. **The far-past guard.** Every shipped reconciler drops elapsed time beyond
   `MAX_REASONABLE_GAP_SEC` (4h). That guard exists to protect **bodies** ("real
   absence never starves you"). **Food is not a body.** The family clock says
   owned things run on **world time**, and the metabolism tail is explicit: *"it
   rots whether you're logged in or not."* **Spoilage must integrate the full
   gap.**
2. **The linkdead freeze** keys on `isHasInteractive && isLinkdead` — an item
   has no Interactive, so it never fires. Harmless, but do not copy it in
   believing it does something.

---

## The one real seam — and it is already an override point

Discrete food is a plain `Thing` whose nutrition lives on a **shared `Material`
singleton**, so it is fixed at mint and shared across every instance. Mutating
`Material.getToxicity()` would poison every ration in the world.

But the ingest path is *already* an override chain — `Metabolic.ts`:

```ts
for (const tox of payload?.toxicity ?? material.getToxicity()) { … }
```

`BulkPayload` **already shadows the Material** for both nutrients and toxins.
That is a working per-instance mutable-toxicity path — it is simply only
reachable from **bulk** today.

> **So the whole downstream lights up by adding one rung**: a freshness override
> ahead of the material fallback. Everything past that point — pool → burden →
> band → `ptomaine` → the vomit window → the antidote crash — is shipped and
> authored.

*(Content note: `trail-ration` / `spoiled-ration` already exist as a Material
**pair**, the spoiled row carrying `ptomaine: 700`. `ConsumableMaterial`'s
fixed-vocabulary rule sanctions that granularity but forbids a row-per-staleness
explosion — so freshness must be a **gauge**, with at most a fresh/spoiled pair
per kind.)*

---

## Substrate audit (verified 2026-07-31)

| Area | State |
|---|---|
| **Time-driven object decay** | **ABSENT** — no object's quality falls with elapsed time; every wear axis is use-driven by policy |
| **The growth term** | **ABSENT** — shared with [disease](./disease-slate.md); build it **here** first |
| **Water activity** | **EXISTS, universal** — `WetMixin` on every `Thing`/`Vessel`/`Agent`, banded, material-driven |
| **Ambient humidity** | **EXISTS** — a resolvable `AtmosphericMixin` field |
| **Temperature per object** | ⚠ **PARTIAL** — `ThermalMixin` is opt-in, ~11 classes; a plain `Thing` has none |
| **Cold storage** | **EXISTS** — the atmosphere walk terminates on first override; `Location` **and** `Vessel` carry it. Pure containers are skipped |
| **Reconcile skeleton** | **EXISTS** — four object-side gauges to copy (`Wet.ts` is the closest) |
| **`Durable`/`Keen`** | **EXISTS** — the two-axis precedent a third gauge follows |
| **Dynamic toxicity** | the override rung **EXISTS** (`payload?.toxicity ?? …`), reachable only from bulk |
| **`ptomaine` + `spoiled-ration`** | **SHIP** — the consumer is authored |
| **Salt (solid)** | ⚠ **ABSENT** — only `bulk/salt-water` |
| **Preservation recipes** | **ABSENT** — no time-, salt-, or airflow-gated craft anywhere; `'tangible'` output is the fresh→cured shape |
| **`Grade` mutability** | mutable, but **deliberately not to be used** — see above |
| **The reset sweep** | restorative only; nothing degrades on it. `ResidencyLogic` is the sanctioned home *if* a push model is ever needed — but pull is right here |

---

## v1 scope

One perishable class (**fish** — fishing is the stated driver) · a `Freshness`
gauge in `lib/material/` copying `Wet.ts` · `ThermalMixin` composed on
perishables · the rate from temperature × water activity × a tabulated material
constant · **one** counterplay (**salt** — author the Material, add a curing
recipe on `'tangible'`) · banded read · the freshness rung on the toxicity
override.

Then: drying and cold (nearly free), smoking, the preserving branch, and the
trade geography that follows.

---

## Open questions

- **Where the gauge is composed.** On every `Thing` (like `WetMixin`) and inert
  unless the Material has a shelf-life constant? Or opt-in per class? *(Lean:
  universal-and-inert — it matches wetness and avoids an authoring burden, but
  it is a persisted-field cost on every object.)*
- **What the material constant actually is** — a shelf-life time constant, or an
  activation energy for a proper Arrhenius/Q10 form? *(The latter is more honest
  and reuses thermal's Q10 idiom.)*
- **Bulk vs. item.** A barrel of salt pork is bulk; a fish is an item. Does the
  gauge live on both, and does `BulkPayload` gain a freshness field?
- **Does cooking reset or slow the clock?** (Real answer: both, by method — and
  a good reason for cooking to matter past nutrition.)
- **Does sealing do physics**, or stay binary? `SealableMixin` has none today.
- **Numeric calibration** — every rate. Deferred to a running game.
