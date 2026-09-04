# Food safety slate — the second population, and what preservation actually preserves

> **Status: design, captured 2026-09-03.** The three structural forks below
> were settled in conversation and are marked **[DECIDED]**; the rest is the
> surface they imply. This slate does **not** re-design the spoilage core —
> that **shipped** with the cooking build (MR !231) and its permanent record
> is [spoilage.md](../../subsystems/spoilage.md).
>
> **The one-sentence build:** food already goes off in a way you can smell,
> and the thing that actually hurts you is the thing you *cannot*.

See also — the parents: [preservation-slate](./preservation-slate.md)
(⭐ **read first.** Its *mechanism* half shipped; this slate is its
*endeavour* half plus a centre it did not have. Its § *terms, not methods*
is the completeness doctrine and is **inherited unchanged**) ·
[disease-slate](./disease-slate.md) (⚠ **the boundary.** This build fills
`ProgressionSpec` and leaves `ContagionSpec` untouched — see Part 4) ·
[cooking-slate](./cooking-slate.md) (shipped; the kill step is its) ·
[ranching-slate](./ranching-slate.md) (§ *the ranching seam — leave it open*;
this build finally cuts it, from the hunting side) ·
[rendering-slate](./rendering-slate.md) (the non-meat half of a carcass —
adjacent, not annexed) · [pharma-slate](./pharma-slate.md) (⚠ **cut** — see
Part 10) · [health-vertical-slate](./health-vertical-slate.md) (the medic
demand this creates) · [sampling-and-labs-slate](./sampling-and-labs-slate.md)
(the bench answer to an invisible question).

Substrates: [spoilage.md](../../subsystems/spoilage.md) (the growth law, the
bands, the dose) · [metabolism.md](../../subsystems/metabolism.md) (the
ingest rung, `ToxinTag`, `labileAtK`) ·
[vitals.md](../../subsystems/vitals.md) (`reconcileConditions`, the
`TraumaBehavior` table) · [harm.md](../../subsystems/harm.md) (the medic
vertical) · [thermal.md](../../subsystems/thermal.md) (Newton cooling — the
danger zone for free) · [mortality.md](../../subsystems/mortality.md) (the
rescuable dying clock — the stakes, already built) ·
[crafting.md](../../subsystems/crafting.md) (the recipe shape a cure needs) ·
[bulk.md](../../subsystems/bulk.md) (`BulkPayload`, the pour blend).

---

## Part 0 — What shipped, and what this is

The [preservation slate](./preservation-slate.md) split the territory into
*"spoilage is the mechanism; **preservation is the endeavour**"* and then sat
unbuilt for a month. The cooking build took the mechanism half whole:

| the four levers preservation-slate named | state |
|---|---|
| **temperature** (`f_T`) — cold, cellaring, freezing | ✅ shipped (Arrhenius, per-material `Ea`) |
| **water activity** (`f_aw`) — salting, drying, curing, sugar | ✅ shipped **as a constant** (see Part 2 — this is the gap) |
| **load reset** (the kill) — cooking, sterilisation | ✅ shipped (333 K, formed-toxin deposition) |
| **acidity** (`f_pH`) — pickling, lacto-fermentation | ⚠ still absent; still a `FermentProfile` row, not a subsystem |

So three of four terms are live, 30 of the library's 107 materials tabulate
`spoilActivationEnergy` + `waterActivity`, and `lint:perishable` gates that a
perishable row lands on a class that can rot.

**And yet nothing in the game preserves anything.** Salt ships
(`trade-cooking/…/material/salt.yaml`, `waterActivity: 0.15`, tagged
`seasoning`) and its own comment explains that it keeps *"because there is no
available water in it — and that is exactly why salting other food works
too."* Salting other food does not work. There are 14 cooking recipes and not
one of them is a cure, a dry, or a smoke.

This slate closes that, and adds the thing the preservation slate never had:
**a reason the counterplay is not enough.**

---

## Part 1 — ⭐⭐⭐ The punchline: curing preserves the contamination

The two decisions below were taken separately and turn out to compose into
one rule, which is the whole build in a sentence:

> **Lowering water activity suspends every population, pathogens included —
> it does not kill them.** A cured ham made from clean meat keeps forever. A
> cured ham made from dirty meat is a **shelf-stable poison** that is still
> dangerous next winter.

That is the exact mirror of the rule the cooking build already shipped and
wrote into [spoilage.md](../../subsystems/spoilage.md): *"heat kills the
population; it does not destroy what the population made."* Same sentence,
other axis. **Heat kills but does not clean; curing cleans nothing and kills
nothing — it only stops the clock.** Neither half of "cook it or cure it" is
safe alone, and knowing which one you need is the curriculum.

⭐ It is also honest microbiology, not a designed gotcha. It is why
traditional curing is a *sequence* (salt the sound animal, promptly) rather
than a rescue, and why every food-safety course opens with *you cannot cure
your way out of a bad start*.

---

## Part 2 — Per-instance water activity **[DECIDED]**

**Today `a_w` is a Material constant.** One function is the whole seam:

```ts
// Freshness.ts:241 — material only; no host, no slot
public static waterActivityOf(material: Material): number
```

`growthRate(material, tempK)` (line 203) has the same shape, and everything
else integrates off those two. So the blast radius is small and knowable.

But **drying, salting and sugaring all change the a_w of the same food.** The
alternative — a material pair per state (`pork` → `salt-pork`) — is honest
for a single change (curing really is a chemical change) and explodes the
moment you stack hurdles, which is exactly what the trade does: *salt cod is
drying + salting; a proper cure is salt + smoke + time.*

### The decision: two stored scalars, one derived answer

- **`moisture`** — water content relative to the material's native value
  (1.0 = as-harvested; lower = dried).
- **`solute`** — cure loading actually taken up (salt, sugar, honey).

`a_w` derives from both plus the material's tabulated base, still
derive-on-read, still one number at the point of use. Both fields land
symmetrically on **both halves** of the shipped gauge — the mixin's
`fieldMeta` and `BulkPayload` — because a barrel of brined pork is bulk and a
hanging ham is not.

**Why two and not one collapsed effective-a_w:** a reversibility asymmetry
that a single scalar cannot express. **Drying comes back and curing does
not.** Jerky in a damp cellar slowly rehydrates; a salted ham does not
un-salt. Collapse them and you either lose the dry store as a real place, or
you make curing undoable by weather.

### ⚠ The trap: this must NOT ride `WetMixin`

The preservation slate lists wetness as *"free — already universal"*. It is
the wrong gauge. `WetMixin` models **surface** saturation and **drains toward
ambient on its own** — it is built to return to dry. Internal moisture must
not. Hang `a_w` on it and a dried fish walks through fog and comes back
fresh.

The honest coupling runs the other way and is much weaker: **humid storage
slowly raises `moisture`**, which is why you seal jerky and why a dry store is
worth building. That is a term, not the carrier.

### Two things that come free

- **The gradient already behaves.** `f_aw` is a linear ramp above the floor —
  `(a_w − 0.60) / 0.40` — so 0.99 → 0.80 halves the rate, 0.70 quarters it,
  and 0.60 stops it dead. **Partial curing already earns honest partial
  credit and full curing is a cliff.** Hurdle stacking pays off smoothly and
  then discontinuously, with nothing added.
- **The pour blend is already right.** Loads blend by mass on every transfer
  ([spoilage.md § the blend half](../../subsystems/spoilage.md)); `moisture`
  and `solute` follow the same path, so brine dilutes into stew correctly for
  free.

---

## Part 3 — The pathogen split **[DECIDED — this is the centre]**

The shipped gauge is **one** population driving **both** the smell and the
dose, calibrated so that *"you get a smell warning before you get a dose —
the gauge teaches before it punishes."* That was the right call for a first
build and it is also, precisely, the intuition that every food-safety
curriculum exists to destroy.

> ***Salmonella*, *Listeria*, *E. coli* and *C. botulinum* do not smell, do
> not look wrong, and do not taste off.** The stuff that stinks mostly makes
> food unpleasant. The stuff that hospitalises you is invisible.

So: a **second population** on the same law with the same closed-form
integrator, differing in four ways — three of which are constants rather than
code.

### 1. It is silent — and that is one line

```ts
// Freshness.ts:120
const FRESHNESS_CHANNELS: readonly string[] = ['vision', 'smell'];
```

The pathogen population declares an **empty channel list**. Nothing to see,
nothing to smell, no taste line, no augmenter. The entire invisibility is a
field.

### 2. ⚠ It cannot start from the inoculum — the one real code seam

`advance()` floors the load at the seed population whenever the rate is
positive:

```ts
const l0 = Math.max(clamp01(load), Freshness.inoculum());
```

That floor is **correct for spoilage** — the flora is everywhere, so
clean-looking food still starts growing. It is **exactly wrong for
pathogens**: run a zero pathogen load through `advance` unchanged and every
piece of food in the world spontaneously becomes contaminated. The inoculum
becomes a property of the population rather than a global dial.

Which is the design's spine, and what keeps it from being miserable:

> ### ⭐⭐⭐ Spoilage is a clock. Contamination is an EVENT.
> Your food never spontaneously becomes dangerous. **Something happened to
> it** — and the thing that happened is a place you were, a tool you used, or
> an animal you opened.

This is also the Law-2 clearance, inherited: the preservation slate's *"the
clock starts at an act, never at ownership"* holds twice over here, because
the pathogen clock does not even start without one.

### 3. Its kill curve is its own — and `killRatePerHour` should stop being flat

Verified at `Freshness.ts:208`: above `killK` the rate is a bare negative
dial, temperature-independent. Real thermal death is steeply
temperature-dependent (the z-value), and that is the actual lesson:

> **It is not a temperature. It is a temperature held for a time.** 60 °C for
> three quarters of an hour is 71 °C instantly.

Making the death rate Arrhenius the way the *growth* rate already is costs a
few lines, is symmetric with the half that shipped, makes a simmer and a sear
genuinely different acts, and gives the thermometer something to be for
(instrumentation's `measure` already exists).

### 4. ⭐⭐ The danger zone already exists, and the counter stew is nearly free

The danger zone is not a new concept to add — **it is literally the region
where `growthRate > 0`**, between `freezingK` (273 K) and `killK` (333 K).
`ThermalMixin` already does Newton cooling. So a pot of stew left out cools
slowly through that band on wholly shipped machinery, and a spore-former
(Part 5) needs two constants to make **"cool it fast"** a real mechanic.

That is the single most common real-world food poisoning there is: **you get
sick from food you cooked properly.** Nobody believes it until it happens to
them, which makes it the best possible thing for a simulation to teach.

---

## Part 4 — In-host growth, no transmission **[DECIDED]**

An ingested pathogen **grows inside you**. Incubation stops being a tuned
delay constant and becomes a small inoculum climbing the same logistic curve
the food was climbing — which is both the honest model and the one whose
arithmetic is already written.

### ⭐⭐ The slot was reserved for exactly this

`Condition.ts` already declares both halves of the disease model, one built
and one deliberately empty:

```ts
/** Stages + cadence for a progressing condition. */
export interface ProgressionSpec {
  intervalMs: number;
  // Stages/cadence detail is content; no live scheduler is built here.
}

/** Disease-spread descriptor — RESERVED, no consumer in this build. */
export interface ContagionSpec { vector: string; }
```

> **In-host growth fills `progression`. No-transmission is `contagion` left
> untouched.** The scope boundary is one field nobody edits — about as clean a
> line as a build gets, and it is why this decision is safe to take inside a
> food build rather than waiting for the disease build.

The disease slate's own stated wish is served exactly: *"build the growth
term here, prove it on a fish, and disease inherits it working."* It now
inherits the **within-host** term working. Room-to-room spread — which that
slate correctly says must be a **push** tick because nobody reads an empty
room — remains entirely unbuilt and unpromised.

### The carrier to copy is `TraumaBehavior`, not `toxinBehavior`

`Condition.ts` already runs a per-type strategy table —
`onset / tick / resolve / reopen / describe`, co-located with the value,
driven by `VitalsMixin.reconcileConditions` on reconcile-on-read in
**game-time** so it freezes correctly on absence.

**An infection is a sibling of a wound**: a thing in you that develops over
time and can be treated. It is *not* a burden that decays, which is all
`toxinBehavior` models. Copy the trauma shape.

⚠ **Host resistance stays thin in v1** — a scalar read off vitals/nutrition,
matching disease-slate's *"good husbandry **is** immunity"* in shape without
building it. **Acquired immunity / prior exposure is NOT in scope**: it needs
a memory model, and it is the disease build's.

### Stakes: the existing dying arc, not a new death path

A severe untreated infection drives vitals down until the **shipped rescuable
`dying` clock** takes over ([mortality.md](../../subsystems/mortality.md)).
The infection needs no death mechanic of its own — and food safety needs real
stakes or it is a chore.

### Diagnosis is where the invisibility stops being unfair

The **illness** is legible — fever, cramps; `observableSigns` already ships
as a vocabulary. The **cause** is not. `resolution: { by: … }` is the seam
that makes recovery a *procedure*.

> **Invisible to the senses, knowable by procedure.** That is the lesson, and
> it creates honest demand for a doctor instead of a lecture — a second
> customer for the medic vertical in [harm.md](../../subsystems/harm.md), and
> the natural first client of
> [sampling-and-labs](./sampling-and-labs-slate.md)'s bench.

---

## Part 5 — ⭐⭐⭐ The roster IS the curriculum

The content pass is not flavour. **Each pathogen exists to break one of the
player's habits**, and the roster is therefore a sequence of lessons, each one
an object with a handful of constants.

| pathogen | the habit it defeats | how |
|---|---|---|
| *Salmonella* / *Campylobacter* | **none — the baseline** | ordinary and common; teaches the rules by obeying them |
| *Listeria* | **cold storage** | grows at refrigeration temperature — the cellar stops being a solution |
| spore-formers (*C. perfringens*, *B. cereus*) | **cooking** | spores survive the kill step, then germinate as the food cools through the zone |
| *E. coli* O157 | **"a little won't hurt"** | infectious dose ~10 cells; dilution does not save you |
| *Staph aureus* | **cooking, again** | a **heat-stable** toxin — kill the population, keep the poison |

Two of these need a constant the engine does not have yet (a spore survival
fraction through the kill step, and a germination threshold); the rest are
rows.

### ⭐⭐ Botulism is the case that proves the split was right

*C. botulinum* is a **toxin**, not an infection, so it does not touch the
in-host path at all. It rides the **shipped** `formedToxins` channel — and
because botulinum toxin is genuinely heat-labile, it uses **`labileAtK`,
which already exists** and already distinguishes a raw bean's lectin (labile)
from ptomaine (not).

> Two reaches coexisting is not a compromise in the model. It is the model
> being right about a real distinction: **some things poison you, some things
> infect you, and boiling fixes exactly one of them.**

⚠ It also lands on the sealed-jar case the preservation slate deliberately
deferred (*"honest oxygen means splitting the flora into aerobes and
anaerobes, and anaerobic sealed-jar failure is botulism"*). **That deferral
holds.** Sealing stays binary; botulinum arrives as a toxin row with a
condition on the vessel, not as an oxygen model.

---

## Part 6 — Butchering: the contamination event, and the deadline

**The pathogen half needs a source or it is inert**, and butchering is the
honest one: a warm carcass, the gut, a dirty knife. This is why butchering
moves *into* the build rather than staying a follow-on.

It is also where the pressure lands mechanically:

> **A kill hands you far more meat than you can eat, with a clock already
> running.** The preservation decision is forced at the moment of the kill,
> which is exactly what "use it or preserve it" has to mean to be a decision
> rather than a slogan.

### What exists and what does not

- `Corpse` **exists** — `class Corpse extends Creature {}`, the forensic
  Creature from the mortality build; **one row** ships
  (`generic-objects/…/stuff/agent/Corpse.yaml`).
- **23 animal species rows** ship, so there is prey without ranching. ⭐ **This
  build takes the hunting side of the seam
  [ranching-slate](./ranching-slate.md) explicitly left open** — no livestock,
  no husbandry, no herd.
- `Harvestable` / `Fruiting` is **plant-side only** (`lib/husbandry`). **There
  is no path from a dead animal to meat.** That is the gap.
- `render-tallow` **already ships as a recipe**, so the non-meat half has a
  toehold and [rendering-slate](./rendering-slate.md) stays adjacent rather
  than annexed.

**Cross-contamination** — the board, the knife, the hands — is the second
event and comes nearly free once the first exists: a contaminated surface is
a pathogen load on a `Serviceable` thing, and the serviceware tier
(`ServiceableMixin`, soiled/wash) shipped with the cooking build. ⭐ **`wash`
is already a verb.** It is about to mean something.

---

## Part 7 — Substrate audit (verified 2026-09-03)

| area | state |
|---|---|
| the growth law, bands, dose, blend | ✅ **SHIPPED** — [spoilage.md](../../subsystems/spoilage.md) |
| the kill step at 333 K + formed-toxin deposition | ✅ **SHIPPED** |
| `waterActivity` | ⚠ **material constant only** (`Freshness.ts:241`) — Part 2 |
| `killRatePerHour` | ⚠ **flat above `killK`** (`Freshness.ts:208`) — Part 3.3 |
| the inoculum floor in `advance` | ⚠ **global** — blocks a zero-start population — Part 3.2 |
| sense channels | ✅ a filtered list (`Freshness.ts:120`) — silence is a field |
| `ToxinTag` + `labileAtK` | ✅ **SHIPPED**, generic; one toxin Condition ships (`ptomaine`) |
| `ProgressionSpec` | ⚠ **declared, unbuilt** — *"no live scheduler is built here"* |
| `ContagionSpec` | ✅ **reserved, untouched** — the scope boundary |
| `TraumaBehavior` + `reconcileConditions` | ✅ **SHIPPED** — the carrier to copy |
| the rescuable `dying` clock | ✅ **SHIPPED** — the stakes |
| Newton cooling / the danger zone | ✅ **SHIPPED** — it is `growthRate > 0` |
| salt as a Material | ✅ ships (a_w 0.15) — but tagged `seasoning` and preserves nothing |
| preservation recipes | ❌ **NONE.** 14 cooking recipes, no cure/dry/smoke |
| a path from carcass to meat | ❌ **NONE.** `Harvestable` is plant-side |
| `wash` + `ServiceableMixin` | ✅ **SHIPPED** (cooking build) — the cross-contamination carrier |
| acidity (`f_pH`) | ❌ absent; still a `FermentProfile` row when a consumer wants it |

---

## Part 8 — ⚠ Findings filed on the way

Three things this audit turned up that are true **today**, independent of
whether this build happens:

1. **`progression` is authored but dead.** Fifteen `Condition` rows ship;
   twelve author `progression: null`, and **three author a real cadence that
   nothing reads** — `starvation` (1 h), `dehydration` (30 min),
   `recovering` (1 h). Same shape as `feel`/`taste` never having run:
   authored enabling data, failing closed and silent. **Filling the slot
   fixes three shipped conditions as a side effect.**
2. **`Condition`'s class docstring is stale** — *"ZERO content ships — the
   class + field shape only; the catalog is a later wave."* The catalogue
   landed; fifteen rows ship.
3. **The fermentation/spoilage collision on `Vat` is still open**
   ([spoilage.md](../../subsystems/spoilage.md) calls it *"luck resting on a
   decision, not a guard"*). A pickling branch walks straight into it, so
   whoever builds `f_pH` inherits that decision. **Not this build's** — but
   it is now the *second* slate to say so, which is the signal it should be
   somebody's.

---

## Part 9 — Build shape

Five waves. **The live drive is one story**, and it is the acceptance test:

> Kill something → butcher it → it is more meat than you can eat → cure some,
> cook some, leave some → the cured keeps, the left-out spoils loudly and
> visibly, and **the contaminated one makes you sick twelve hours later with
> nothing having warned you.**

| wave | what |
|---|---|
| **W0** | **per-instance a_w** — `moisture` + `solute` on both halves; `waterActivityOf` gains a carrier; blend-by-mass on pour. Drying and salting become one mechanism. |
| **W1** | **the preservation crafts** — cure / dry / smoke; hurdle stacking; salt cod. Salt stops being a seasoning. *(This is preservation-slate's endeavour half, finally.)* |
| **W2** | **the pathogen population** — second load, empty channel list, per-population inoculum (event-seeded, no floor), Arrhenius kill rate. |
| **W3** | **butchering** — `Corpse` → cuts; the contamination event; cross-contamination over the shipped `wash`; the clock that starts at the kill. |
| **W4** | **in-host infection** — fill `ProgressionSpec`; the Part 5 roster; symptoms off `observableSigns`; the medic seam; the dying arc as the ceiling. |

⚠ **W0–W1 are shippable alone and are worth something alone** (they are the
preservation slate's whole v1). W2–W4 are the centre and are not separable
from each other — a silent population with no source and no reach is three
inert fields.

---

## Part 10 — The cut, and why

**Molds are OUT.** A genuine third microbial idiom — *visible, surface-borne,
spreading by contact, and sometimes the point* (blue cheese, koji, tempeh,
the bloom on a salami). It is a clean follow-on precisely because
**fermentation already established the pattern**: a microbe is a living
Material with viability and strain, bridging to a species row, and the
`fungi` clade already ships (`Saccharomyces cerevisiae`, `pastorianus`;
`Mycena lucifera` in Rejection). `Penicillium`, `Aspergillus` and *Claviceps
purpurea* are **rows in an existing taxonomy**, not substrate.

Held for that build, because they are too good to spend as an afterthought
here:

- ⭐ **Aflatoxin survives cooking** — `labileAtK` already expresses it.
- ⭐⭐ **Ergot** is the best single content object in this whole space: it
  links storage, mass poisoning, hallucination and medicine in one row, with
  real history behind it.

**Medicine is OUT.** [pharma-slate](./pharma-slate.md) owns credence goods
and the institutions around them, and penicillin wants the mold build to
exist first. **This build creates the demand** (an invisible illness needs a
diagnosis, a diagnosis needs a diagnostician) and deliberately does not
supply it.

**Rancidity is OUT and is not this law.** [spoilage.md](../../subsystems/spoilage.md)
already records the deferral — *"staling by oxidation (coffee, oil going
rancid) is **not a microbial story** and the gauge says nothing about it."*
Olive oil and rendered tallow now ship, so a consumer exists; it wants its
own small law, not a term in this one.

**Acidity (`f_pH`) is OUT** — the fourth lever, still absent, still a
`FermentProfile` row plus a read when someone wants pickling. Naming it here
so the term set stays visibly *closed*: after `f_pH`, any method a player
names is checkable against the equation rather than needing design work.

---

## Open questions

- **Where the infection gauge composes.** An infection needs a living body —
  `OrganismMixin` gates animacy, `VitalsMixin` holds the reconcile. Lean:
  wherever `reconcileConditions` already lives, since that is the driver. ⚠
  Answer it with the host-set count, not by argument (the four-round lesson
  from MR !231).
- **Does a pathogen load ride the same `BulkPayload.freshness` shape**
  (a second `{load, stamp}`), or a sibling field? The pour blend and the
  material shadow both have to keep working either way.
- **Cross-contamination's reach.** A board and a knife are obvious. Hands are
  obvious and unpleasant. Does a *room* carry a load (a filthy kitchen), or
  does it stop at objects? Lean: objects only in v1 — a room-borne load is
  the push-tick shape disease-slate reserved, and taking it here would breach
  the Part 4 boundary by the back door.
- **How much a player can learn without a lab.** Cook-to-temperature is
  teachable with the shipped thermometer. Is there any sense channel at all
  for contamination, or is procedure the only route? *(Lean: procedure only —
  it is the entire point — but this is the misery dial and wants a real
  answer before W2.)*
- **Numeric calibration** — every rate, as ever, deferred to a running game.
  ⚠ But the shipped ptomaine curve was fitted against an *authored* seed and
  the two agreed without either being tuned; the pathogen bands want the same
  discipline rather than a fresh set of invented numbers.
