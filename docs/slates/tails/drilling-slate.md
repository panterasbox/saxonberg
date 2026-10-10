# Drilling slate — the extraction that does not expand the map

> **Status: PARTIAL** — SHIPPED 2026-10-09 (MR !353) →
> [drilling.md](../../subsystems/drilling.md). All three stages (brine ·
> gas · oil), a new `trade-drilling` pack, and the premise driven live:
> ⭐⭐⭐ **two factors and only one has a channel** — a trap's STRUCTURE
> reads with a bracket that narrows with the instrument and widens with
> depth, and whether it is CHARGED has no reading anywhere in the game,
> so a dry hole survives every instrument and the payroll is a **bet**.
> The borehole is a **POINT, not a place** (no room, no location-graph
> node); the fluid leg is derived from the **arch**, so the spring sits
> on the rim and the flat over the crest and *the place the ground tells
> you about is not the place to dig*; the barrel is
> `separation: fractions` — *you cannot distil crude and choose not to
> make the light ends.* Drive 24/24.
> **Left:** ⛔ **`cap`/`plug`** — an uncapped well leaks and there is no
> act that stops it, not even a refusal (the liability the polity gets to
> price) · **secondary recovery** (wants the
> [pump](./pump-slate.md) first) · ⚠⚠ **the crew's RATE**, measured at
> one metre per two-hand game-day and an order of magnitude light —
> `SAMPLE_CAP_S` credits a clock jump once rather than replaying it, and
> which number is wrong is a balance question. See § Tail.
> **Size:** a tail — each remaining piece is small or rides another
> build; none is its own cycle.

⚠ **Nothing petroleum exists in the tree**: no oil, no naphtha, no
kerosene, no tar, no pitch. `olive-oil` is a food.

---

## ⭐⭐⭐ The new shape: extraction without excavation

Every extraction act this engine ships **makes place.** `dig` and `split`
open a working; mining's `hew`/`drive`/`sink`/`raise` carve a heading;
`MineWarren` carve/shore/promote literally mints Locations you stand in.
The void *is* the product's address.

> **A borehole is not a place.** It is too narrow to enter, and what comes
> out comes up a pipe.

**Drilling is the first extraction that does not expand the map**, and
three consequences follow that make it a different game rather than a
reskin:

### 1 · ⭐⭐ The survey IS the game

You cannot walk to the deposit and look at it. The **only** route to
knowing what is down there is instruments plus a model — which makes
drilling the most demanding consumer the
[instrumentation](./instrumentation-slate.md) ladder will ever have, and
[inquiry](./inquiry-slate.md)'s sharpest case.

Mining **reveals** its field by cutting: you see the band when you reach
it, and prospecting is a deduction whose answer you eventually walk into.
Drilling makes you **predict** the field and then **test at great cost**.

### 2 · ⚠ The dry hole, and why it is honest

A dry hole must be possible and must hurt. It is legitimate under
[uncertainty.md](../../uncertainty.md) for exactly one reason:

> **The field is SEEDED.** The oil either is or is not there,
> deterministically, before anybody looks. Your uncertainty is
> **epistemic** — provenance 1, legal — never **resolutional**, which is
> banned. *Roll to decide what the world IS, never what your action DID.*

The world already decided. You just do not know. ⭐ That single
distinction is what separates an honest wildcat well from a slot machine,
and it is why this build **must** sit on the seeded `Deposit` field
(→ [field-substrate](../tails/field-substrate-slate.md)) rather than on a
draw at the moment of drilling.

⚠ **The failure mode to refuse by name:** a `Math.random()` at
`completeWork` that decides whether this hole struck oil. It would feel
identical to the player and it would be the exact inversion of the
engine's governing rule.

### 3 · The capital shape

A borehole is the first extraction where **the whole cost is paid before
you know anything**. That is a genuinely different economic object from a
quarry face, and it is the honest reason oil concentrates capital —
which the game gets to teach for free, by arithmetic, with nobody
authoring a lesson about it.

---

## ⭐⭐⭐ Refining is the distiller's DEFERRED CUTS RUNG

The cheapest finding in the slate, and the third of its kind this
session.

✅ **BUILT 2026-10-04 — this section is kept as the record of why, and
is no longer a prediction.** `MaturationProfile` carried an inert
`foreshotCharacter` field annotated *"P10 — the deferred **cuts** rung's
seam"*; the whiskey build **retired the field** and shipped the mechanism
as [fractionation.md](../../subsystems/fractionation.md). Heads, hearts,
tails: the distiller decides where the boundaries fall, and the craft is
knowing where.

**Fractionating crude is that same act** — separate a mixture by boiling
point, operator decides the cut points. More cuts, different feedstock.

> **Refining needs no new mechanism.** It needs the cuts rung, which
> `trade-distilling` already wants for whiskey.

⭐⭐ **Sequencing recommendation that falls out of this:** *build the cuts
rung for whiskey first.* It is a **medieval-epoch** build that pays for
itself immediately in a shipped trade, and it **pre-builds refining for
free**. Do not wait for oil to justify it.

⭐ Same shape as the saltern → sugarhouse and resin → latex findings:
**the substrate is ahead of the content, again, and the third instance is
where you stop calling it a coincidence.**

---

## The fractions, and who is waiting

| cut | consumer | state |
|---|---|---|
| **light** (naphtha) | solvent; later, feedstock | — |
| **kerosene** | ⭐ **lamp fuel** — the first mass consumer, historically and here | light.md ships a lamp model |
| **gas oil** | heat, engines | the furnace family ships |
| **lubricant** | ⭐ every machine in the metal chain and the mine | shipped hosts, no lubricant concept |
| **residue — tar / asphalt** | roads (→ [logistics](./logistics-slate.md)'s cost surface), waterproofing | ⚠ **competes with the retort's tar** |

⭐ **Kerosene is the right first fraction** — it is what actually drove
the oil industry before engines existed, it has a shipped consumer
(lamps), and it does not require inventing a vehicle.

---

## ⭐ The loop that closes

Lifting oil needs a **pump**. A pump needs a **seal**. And mining's Left
already owns *"everything below the water table — shaft/hoist/pump,"* so
the pump has two waiting customers before oil exists.

⚠⚠ **CORRECTED 2026-10-08 — a seal is LEATHER before it is rubber.** This
section read *"a seal is **rubber**"* and built a dependency on it; every
pre-industrial pump used **leather packing**, and `trade-tanning` ships
`tanpit`, `tan` and `leatherwork`. ⛔ So **drilling is NOT gated on
rubber** — tanning is in the supply chain and rubber is the **upgrade**
(a leather gland weeps and wants repacking; a rubber one does not).
⚠ A premise stated once got cited: it became a starred section with a
quotable aphorism before anybody checked it.

Then oil eventually makes rubber **cheaper** (synthetic elastomer, the
same law with a petroleum feedstock — see
[design-lenses § 5](../../design-lenses.md)).

> **Rubber improves the machine that eventually cheapens rubber's own
> feedstock.** The loop still closes; it is a loop of **degree, not of
> dependency**, and nobody has to author the irony.

---

## ⭐⭐⭐ Gas is a different well, and it is NOT drilled first

Asked 2026-09-25: *how does drilling work for gas vs liquid, and is gas
always drilled or can it be mined?* The answer reshapes the vertical.

### Gas already exists here, in three places that do not know about each other

- ⭐ **`bulk.md` declares a `sealed` closure level for gas** — the scale is
  `open < liquidTight < sealed`, and the doc says `sealed` and the
  phase→required-level mapping are *"defined on the scale but
  **unexercised until gas content lands**."* An inert, named seam.
- **`AirTank` ships** ([respiration.md](../../subsystems/respiration.md))
  — a worn gas vessel with a fill gauge.
- **The damps ship** — `blackdamp` and `stinkdamp` as working atmospheres,
  with the canary reading the odourless one.

⚠ **And the tell: firedamp is NOT among them.** The mine models the
suffocating damp and the stinking damp and omits **the explosive one** —
which is the one that is also a fuel.

### How a gas well differs from an oil well

| | **oil** | **gas** |
|---|---|---|
| what moves it | reservoir pressure to the bore, then **you lift it** | pressure alone — **it comes up by itself** |
| the machine | a **pump** (whose seal is **leather**; rubber is the upgrade) | none — the problem is *stopping* it |
| storage | a barrel; an open vessel works | ⭐ **nothing below `sealed`** — no vessel, no product |
| depletion signal | falling level | **pressure decline only** — you cannot dip a gas well |
| failure | a spill — messy, recoverable | a blowout; [fire.md](../../subsystems/fire.md) ships the rest |

> ⭐⭐⭐ **Gas inverts the capital problem, which is why both are worth
> having.** Oil's risk is paid **before** you know anything — the dry
> hole. Gas's risk is paid **after you succeed**: you have struck it, and
> it is worthless, dangerous and venting until containment exists. **A gas
> strike with no vessel is a fire, not a fortune.**

And the gate for that is already declared: **`bulk.md`'s `sealed` rung IS
the gas economy**, sitting inert with no consumer.

⭐ It also yields the **gasometer** — a `Bulkable` with `closure: sealed`,
a rising bell in a water seal, **visible across the city, its height
telling anyone who looks how much gas the town has left.** A public,
honest, entirely non-gauge readout of a shared resource.

### ⭐⭐ Gas can be mined, and drilling is the LAST of four sources

| source | what it is | where it belongs |
|---|---|---|
| ⭐ **coal gas** | the retort's **third product**, beside coke and coal tar — town gas, and **lamps ship** | [destructive-distillation](./destructive-distillation-slate.md) |
| ⭐ **firedamp** | coal-mine methane, drained ahead of the face through **in-seam boreholes** | [mining-slate](./mining-slate.md) |
| **seeps** | gas that comes out of the ground by itself — eternal flames, fire temples | a locality; content, not a trade |
| **marsh gas** | biogas off a bog or a dunghill; `organic/peat` ships | whoever wants it; the most medieval-available gas there is |

⭐ **The firedamp arc is the best of them:** *a gas that kills you → a gas
you vent → a gas you collect.* The hazard ships and the resource does
not — the collier's pattern a fourth time, and real history: methane
killed enormous numbers of miners before anyone thought of it as a
commodity.

---

## ⭐⭐⭐ Sequencing — mined gas is NOT designed around drilled gas

The instinct on first asking was to defer the mine's gas-and-liquid pass
until drilling ships, *"since we'd want to design mined gas around drilled
gas rather than the other way around."* **The evidence says the
opposite**, and this is recorded so it is not silently re-litigated.

**1 · The mine's fluid story is already DESIGNED; drilling does not
exist.** `mining-slate` carries a safety-law — *"Foul not the air. Sap not
the props. **Flood not the deep.** Answer the call."* — so **air and water
are already the mine's first two named crimes**, with governance attached
(breaching a sump that drowns the levels below is framed as murder-by-).
Flooding is a hazard, **gas is already named as a stoppage**, and the pump
already has an economic model (*"he is paid the way the pump is: out of
the hoist toll"*). Drilling is blocked on the epoch on-ramp, which is
blocked on inquiry. **Anchoring a designed thing to an unbuilt thing is
the wrong direction** — and it would be the first time this programme did
it, since every finding so far ran the other way.

**2 · ⭐⭐ The SIGN is opposite, and that is the real argument.** In a
mine, water and gas are things you **remove in order to keep working**. At
a well, gas is the thing you are **there for**. Design mined gas around
drilled gas and firedamp becomes *a resource that happens to be
dangerous*; the honest model is the inverse — **a hazard that turns out to
be valuable** — and the arc is *vent it for a century, then collect it*.
Different economics, different UX, and the second one is both true and
better.

**3 · The pump is one object.** Mining's dewatering pump and drilling's
oil-lift pump are the same machine. Mine-first and drilling **inherits a
built pump**; drilling-first and the mine inherits one designed to *lift a
product* when dewatering is a different spec — continuous, unattended,
sized to inflow, funded out of the hoist toll.

### The decision

⚠ The concern behind the original instinct is correct and must be kept:
**do not end up with two parallel gas economies** — that is precisely the
unification debt the standing rule says to stay ahead of. The fix is not
to design them apart, it is to **anchor each half on the right thing**:

| half | covers | anchor |
|---|---|---|
| **the hazard half** | a fluid you must remove to work — water, then firedamp | ⭐ **mining**, where it is already designed |
| **the commodity half** | storage, the `sealed` rung, the gasometer, the market | ⭐ **coal gas from the retort** — the first gas that is a *product* |

> **Neither half is anchored on drilling. Drilling arrives third and
> inherits both.** One gas economy, defined by the first thing that sells
> gas — which is the retort, not a well.

⭐ Consequence worth noticing: the mine's fluid pass is therefore **not
blocked behind drilling** and could go much sooner.

### ⚠ One honest limit to decide deliberately

`AirTank` treats gas as **incompressible bulk** (interior fill
*fraction*). Real gas storage is a **pressure** question, not a volume
one. The abstraction is probably legitimate — *it still costs somebody the
vessel and the labour* — but once gas is a **traded commodity**, *"how
much is in there"* gets asked in a way a fill fraction cannot answer
honestly. Inherit this on purpose or not at all.

---

## ⚠⚠ The flag that belongs on the record now, not at requirements

**Oil is the first resource where recharge = 0 and the reservoir is
enormous.** Every depletable thing shipped so far is a band somebody cuts
out in an afternoon; the [RGO law](./tapping-slate.md) handles it as the
zero case and nothing strains.

Crude is different in kind: **a commons that one operator's extraction
visibly ends, over a horizon long enough that the ending is somebody
else's problem.** That is good, honest, extremely teachable content — and
it is the polity's problem by construction, which is the right place for
it.

But it must be **stated design intent**, not something discovered when a
player drains a field and asks why nothing stopped them. Whether anything
*should* stop them is a **tier C** question
([measurement.md](../../measurement.md) § layer 3) — the polity's, not
the code's. The engine's job is to make the depletion **legible before it
is irreversible**, which is an instrumentation question and therefore
already has a home.

---

## Decided

1. **Drilling ships after destructive distillation.** The industrial
   epoch does not need it, and sequencing it first would make the epoch
   look like it requires a new extraction shape when it does not.
2. **The borehole is a POINT, not a Location.** It does not mint a room,
   and this is the invariant the build is *for*. If a case wants to walk
   down the hole, that case is a mine.
3. ⭐⭐ **The field stays SEEDED.** No draw at drill time, ever.
4. ✅ **Refining is the cuts rung, built once and used twice** — and it
   was built for **whiskey** first, exactly as recommended
   ([fractionation.md](../../subsystems/fractionation.md), 2026-10-04).
   The second use is a `FractionSchedule` row with more spans and a crude
   `inputCategory`; the doc claims this slate as its second consumer by
   name. ⭐ **Third instance of *the substrate is ahead of the content* —
   and the first where acting on it actually paid.**
5. **Kerosene is the first fraction**, because lamps ship.
6. ⭐⭐⭐ **Mined gas is NOT designed around drilled gas.** The hazard
   half anchors on **mining**, the commodity half on **coal gas from the
   retort**; drilling arrives third and inherits both. See the
   sequencing section — recorded so it is not re-litigated.
7. **A gas well needs no pump and no lift** — `sealed` containment is
   its entire capital story, and the failure is a blowout, not a spill.

## Open

1. **What instrument reads the deep field**, and how wrong it is allowed
   to be. The whole game lives here — too accurate and the dry hole
   vanishes; too vague and it is a coin flip wearing a lab coat.
   ⚠ **The deferral in this line is STALE** (noted 2026-10-06): it sent
   the question to the instrumentation slate, but instrumentation SHIPPED
   (MR !292) and shipped it as **rows any pack writes** — a `Reading`
   channel at `<root>/idea/reading/<channel>`, competence resolving
   detail and never access, the instrument as a ceiling, and the seeded
   bracket already modelling *"a number you cannot fully trust."*
   ⭐ So this is **this slate's** question now, and the mechanism for
   answering it is built: the deep field is a reading channel whose
   bracket widens with depth. No other build owes it anything.
2. **Does a well deplete visibly?** Pressure falling is the honest,
   measurable signal and it is the legibility answer above. Lean: yes,
   and it is the *same* reservoir-and-recharge read as every other RGO.
3. **Who owns a field under two parcels.** ⭐ The real-world answer (rule
   of capture vs correlative rights) is a genuine legal doctrine and this
   game has a courts system and a parcel registry. Lean: **do not decide
   it in code** — ship the physical fact that a field spans parcels and
   let the polity fight about it. That is the single best governance
   content this vertical generates.
4. **Whether a vehicle ever arrives.** Out of scope, and kerosene-first is
   what makes it safe to defer.

---

See also: [destructive-distillation-slate](./destructive-distillation-slate.md)
(**ships first**) · [rubber-slate](./rubber-slate.md) (the seal, and the
law) · [inquiry-slate](./inquiry-slate.md) (the epoch on-ramp) ·
[field-substrate](../tails/field-substrate-slate.md) (the seeded field) ·
[instrumentation-slate](./instrumentation-slate.md) (the survey) ·
[mining-slate](./mining-slate.md) (the pump, and everything below the
water table)

---

# ⭐⭐⭐ Design pass — the four opens closed (2026-10-08)

Taken after the fire/DD merge cleared both blockers, alongside
[the RGO spine](../tails/field-substrate-slate.md). The seven **Decided**
items above stand untouched. This closes the four **Open** ones — and
three of the four were already answered by code or by the spine, so the
design work was mostly finding that out.

## ⭐⭐⭐ Open 1 — the survey: TWO factors, and only one of them is readable

*"What instrument reads the deep field, and how wrong is it allowed to be.
The whole game lives here — too accurate and the dry hole vanishes; too
vague and it is a coin flip wearing a lab coat."*

The dilemma dissolves, because **the question assumed one factor and
petroleum has two.**

> ⭐⭐⭐ **The instrument can tell you there is a TRAP. Nothing but the
> drill can tell you the trap is FULL.**

Real exploration needs five things to coincide — source rock, migration,
trap, seal, timing — and surface geology reads **structure** while saying
almost nothing about **charge**. That is why dry holes happen to good
geologists on good structures, and it is the honest mechanism this build
should sit on:

| factor | readable? | how | cost |
|---|---|---|---|
| **structure** — is there a trap | ✅ **yes**, with a bracket | instrumented surface readings projected down | labour, instruments, competence, travel |
| **charge** — is the trap full | ⛔ **no channel exists** | only the hole | the whole well |

### ⭐⭐ Why this permanently fixes the dilemma

**The dry hole survives any amount of instrument improvement.** A better
dial, a better surveyor, a better theory all sharpen the *structure* read
and none of them touches charge — so the bet stays a bet forever, without
anybody having to keep the instruments deliberately bad. That was the
trap the original open was worried about and it is now structurally
impossible.

⚠ And both factors stay **SEEDED**, so Decided #3 is untouched: the charge
was fixed at world-gen, the player's ignorance is **epistemic**, and
nothing rolls at `completeWork`. ⭐ There is also **no refusal** on charge
— not a gated reading, simply *no channel* — which is the correct
treatment, because a refusal is the progression UI only when something can
lift it. Nothing lifts this one, so nothing should promise it can.

### The mechanism is shipped, including the error knob

`packages/content/ground/src/idea/Deposit.ts` already carries the model
half, and its **second read is the one this build wants**:

```ts
surfaceReadingAt(x: number, y: number, errorDeg: number, seed: number): SurfaceReading | null
```

It intersects the lode's plane with `z = 0` and reports the surface trace
and the perpendicular distance to it. ⭐ **That is anticlinal theory** —
inferring a subsurface trap from the dip and strike you can measure at an
outcrop — which is precisely the technique that found the first fields
(the structural-trap idea circulated from the 1840s and was formalised as
anticlinal theory in the 1880s). And `errorDeg` is literally the *"how wrong is it allowed to be"*
parameter, already a function argument.

So drilling's structural survey adds **a `Reading` row, not a mechanism**:
a channel at `/trade/drilling/idea/reading/structure`, with `errorDeg`
resolved from the instrument **ceiling** × the surveyor's **competence**
(detail, never access — the instrumentation law). Mining's shipped
`measure strike` / `measure dip` are the same family and need no change.

> ⚠ **The bracket widens with DEPTH.** That is the one law to author:
> a shallow structure is nearly certain, a deep one is a shrug, and the
> cost of being wrong rises with the same variable. One number does both
> jobs.

### ⭐⭐ And the free signal is a SEEP

The second evidence channel, and it is the one that makes this a deduction
rather than a measurement:

> **A seep is evidence of CHARGE** — hydrocarbons were generated and did
> migrate — and it is free, visible to anybody, and **non-quantitative**.
> It tells you the region is charged and **not where to drill**.

Which gives two independent channels, neither sufficient:

- the **seep** says *there is oil in this country*, and costs nothing;
- the **structure** says *drill here*, and costs a survey;
- **you need both**, and plenty of charged country has no seep.

⭐ Perfectly consistent with the spine's sample-price law: the seep is free
to read, so it is **scenery** and nobody specialises in it; the structure
is expensive, so it is a **career** — the surveyor. Nothing had to be
tuned to make that come out right.

## Open 2 — yes, a well depletes visibly, and the spine says how

Confirming the lean. Under the `(capacity field, recharge law)` pair:
**capacity** is the seeded reservoir volume, **recharge is zero** (the
RGO law's own depletion case, and this is the first reservoir where zero
is enormous rather than a band somebody cuts out in an afternoon).

**Pressure is a derived read of remaining-over-initial** — nothing stored
but the withdrawals, per the field pattern's rule 4. That makes it the
tier-C legibility answer the slate asked for: ⭐ *the engine's job is to
make depletion legible before it is irreversible*, and a falling pressure
gauge does it with no new concept.

⚠ **It inverts the sample-price law, deliberately.** Reading your own
wellhead is **free** — because you already paid for the hole. Drilling's
whole cost is front-loaded, which is Decided's capital-shape point showing
up in the instrumentation as well as the economics.

## Open 3 — confirmed: ship the physics, let the polity invent the law

The lean was right and the ownership correction sharpens it. *Rule of
capture* versus *correlative rights* is not a rule to implement — it is
what **happens** when two straws share one glass:

> **The engine ships one reservoir under two extents. The polity discovers
> that draining is competitive and argues about it.** That is the best
> governance content this vertical generates, and writing a doctrine into
> the code would delete it.

⚠ And it is the **in-fiction** owners who argue — not the maintaining
committee (see the spine's § *the conflation to refuse*). The code reports
that a reservoir spans extents; who may drain it is a question for the
courts this platform already has.

## Open 4 — confirmed out of scope

Kerosene-first is what makes deferring a vehicle safe, and it still is.
Lamps ship; nothing is waiting on an engine.

---

## The spine, applied

| slot | drilling's answer |
|---|---|
| **capacity field** | **seeded** — `(position, seed)`, two factors (structure readable, charge not) |
| **recharge law** | **zero** — and the first reservoir where that is enormous |
| **author contract** | ⭐ the shipped three rungs — **pin over lean over procedural**. Expect **nothing**; allow a **lean** (this basin is oily) and a **pin** (this structure holds the authored field a quest wants) |
| **where the career sits** | the **survey** → the surveyor |

⭐ **The author writes a `Deposit`-shaped row and gets the whole field.**
Which is the reuse worth protecting: *the substrate is ahead of the
content* for the fourth time in this vertical, and the first three all
paid.

## ⚠ What requirements must still settle

Not design questions — two code checks and one content question, flagged
so the requirements pass starts with them rather than discovering them:

1. ⚠⚠ **Does `Deposit` generalise to a FLUID reservoir, or does a
   reservoir want its own row kind?** The class already carries a **water
   table**, so a fluid horizon is represented — but a lode is a *plane
   with grade bands* and a reservoir is *a volume with a contact and a
   pressure*. Reusing `Deposit` is the big win and it may be the wrong
   host; ⭐ the test is the usual one — if a guard is needed to re-narrow
   which fields mean anything, the host is wrong.
2. **Is the borehole a `Thing` on a parcel?** Decided #2 says it is not a
   Location; the positive statement is that a wellhead is **operated, not
   entered** — the same shape the fire build landed on when it split the
   `Burner` from the `Firebox`. The mixin call is the plan's.
3. ⭐ **Which locality gets the first well** — the collision question, and
   it has a real constraint now: the first field wants a **seep**, which
   is surface content somebody has to place. Rejection is the mining
   locality and the obvious candidate; whether an oil field belongs beside
   a mine or wants its own site is a worldcrafting call, not a mechanism
   one.

## ⭐⭐⭐ Addendum — the brine rung, and the barrel is mostly waste (2026-10-08)

Two claims made in conversation, then checked against the tree. The first
came out **stronger** than claimed; the second came out **worse**, and the
worse one is the better design.

### ⭐⭐⭐ 1 · Drilling has a MEDIEVAL rung, and it is salt

Drilling was not invented for petroleum — it was invented for **brine**.
Sichuan salt workers were percussion-drilling narrow holes on bamboo cable
from the Han period, casing them with bamboo tube, and by the 1830s the
Shenhai well passed 1,000 m. They kept hitting **natural gas**, first as a
hazard and then as the fuel they piped off to **boil the brine down to
salt**.

Every piece of that is already in this tree, and the check found more than
expected — `trade-quarrying` ships the whole saltern:

| shipped | what |
|---|---|
| `thing/brine-hearth.yaml` | ⭐ an **`Oven`** — so a fuel BED, touched by the fire build, `ThermalMixin.heatSourceK()` reading the pan's container |
| `thing/salt-pan.yaml` | the pan that goes **in** it |
| `idea/maturation/brine.yaml` | evaporation as a `MaturationProfile` — the patient, solar route |
| `/stuff/idea/material/bulk/salt-water` + `food/salt` | the materials |
| `world/terminus/estuary/salt-house.yaml` | the realm's **one** salt works, and it is **coastal** |

And the hearth's own header states the economics this rung plugs into:

> *"the fuel is what somebody else wanted… salt's three sources are three
> genuinely different cost structures — capital and labour at a rock-salt
> face, patience on the saltings, **fuel** here — and where a person lives
> decides which one they use. The fuel competition was already designed as
> part of the wood contest: the charcoal burner and the smelter want the
> same cordwood."*

So three findings, none of which needed inventing:

1. ⭐⭐ **A drilled brine well is INLAND salt.** The realm's only saltern is
   at the estuary, while the *demand* — `salt-cure` (cooking) and
   `salt-hide` (tanning) — is wherever the food and the hides are. Salt is
   heavy, so this is a **logistics** story on a shipped cost surface, and
   it is unmet demand without anything being authored for it.
2. ⭐⭐⭐ **The Sichuan loop closes a shipped scarcity.** Feed the brine
   hearth the **well's own gas** instead of cordwood and the hearth leaves
   the wood contest its own comment describes. The historical fact and the
   game's economics are the same fact. ⭐ It is also the **fourth gas
   source**, exactly as § *Gas can be mined* predicted, arriving last and
   inheriting both halves.
3. **It de-risks the whole vertical.** The first player to drill is no
   longer betting a fortune on a substance nobody has a use for yet —
   they are selling salt, with oil as the thing the technique grows into.
   ⭐ The capital shape stays honest and stops being a *trap*.

> **Therefore: the brine well is IN SCOPE, and it is the build's first
> rung.** Drilling is not a purely industrial build; it has a medieval
> entry that pays for itself, which is the three-rung ladder again.

### ⛔⛔ 2 · Three of five fractions have NO consumer — and that is the content

The conversation claimed gasoline was the discard. A census says it is
worse than that, and the result reframes the build:

| fraction | consumer | verified state |
|---|---|---|
| **kerosene** | lamps, street lighting, the civic bill | ✅ a consumer **with no producer** (`lamp-oil`'s own row calls its crafted route pending) |
| **paraffin wax** | candles | ✅ ⭐ and free: `candle.yaml` is **one row generalised over its wax**, material stamped at the dip, bed recharged by `adoptMaterialFuel()`. A **drop-in third wax, zero code** — so drilling *disrupts chandlery* |
| **lubricants** | machine wear | ⛔ **nothing.** One incidental mention in a winemaking press; no mechanism consumes a lubricant |
| **asphalt** | paved roads | ⛔ **nothing.** `logistics.md` has no paving, no surface, no macadam |
| **gasoline** | the engine | ⛔ **nothing**, and deliberately — vehicles are Decided #4's out-of-scope |

> ⭐⭐⭐ **A barrel of crude is mostly stuff this realm cannot use.** Which is
> not a content hole — it is **1860 exactly**, and it is the most teachable
> thing in the vertical.

**Decided: ship the barrel honestly.** Do **not** scope in machine wear or
road paving to give the middle fractions customers — each is its own build,
and authoring demand ahead of supply is the circularity the rubber slate
warned about, run backwards. A fraction with no consumer is an
**invitation** to a later build, and absence is meaningful.

Three consequences worth building on:

- ⭐⭐ **Joint production is the lesson.** You cannot choose to make only
  kerosene; distil crude and the light ends come out whether you want them
  or not. The cuts rung already models this — ordered spans over the volume
  drawn, **not a menu** — so the engine states the lesson by construction.
- ⭐⭐⭐ **The refinery's margin is set by the ONE fraction it can sell,
  minus the cost of getting rid of the rest.** Historically exact —
  refiners priced off kerosene and treated the remainder as cost — and it
  falls out of the content tree as it actually is today. That is a P&L a
  player can read.
- ⭐ **The disposal ladder is all shipped machinery**, so the choice is real
  and every branch bites:

  | choice | what it costs | rides |
  |---|---|---|
  | **store it** | volatile + stored is a fire risk | the fire build's ignition balance |
  | **dump it** | an outfall load on the reach | `contaminationAt(reach, now)` sums upstream outfalls — ⭐ and contamination *carries no sensory tell, on purpose*, so this is the quiet crime |
  | **flare it** | fuel burned for nothing, visibly | combustion, and the light it sheds |

- ⚠⚠ **And then the epoch turns and the waste becomes the prize.** Same
  substance, same recipe, opposite value, one era later. Lens 5 with teeth
  rather than as an assertion — and the strongest argument this vertical
  makes for keeping `epoch` a derived read rather than a gate.

## ⭐⭐ The physical walkthrough — stage by stage, and what each rides (2026-10-08)

Walked end to end in conversation (*"its underground, how do you even
know where to drill… all the way to waste and consumer goods"*). Recorded
as the stage list with its attach point, because the striking result is
how little of it is new: the technique is new and almost every **mechanism
it needs already ships for something else.**

| stage | the act | rides |
|---|---|---|
| **know where** | outcrop dip/strike projected down | `Deposit.surfaceReadingAt(x, y, errorDeg, seed)` |
| | seeps · gas vents · burning springs · ⭐ **salt springs** | surface content; the charge channel |
| | ⭐⭐⭐ **other people's logs** | the per-player **map** document — see below |
| | the **dowser** | `uncertainty.md` — mysticism as a correlation with no mechanism, legal |
| **make the hole** | raise a derrick of local timber | forestry's bole + lengths |
| | cut: a heavy bit dropped on a cable, lifted by a walking beam | ⭐ the power ladder — men (`LoadDevice`) → draft animal (hitch/unhitch) → water → steam |
| | **bail** out cuttings and water, then go back in | ⭐ the dominant time cost; a durative engaged cycle with an employed crew |
| | **case** it, to hold the hole and keep water out | smithing demand; the `sealed` rung as a physical necessity |
| | the rate itself | ⭐⭐ `hardnessMPa` — the strata's own number, documented as *"what carve cost is priced on"* |
| **the failures** | lost tools (the real term is **fishing**) · caving · water ingress · blowout | ⭐ the driller's craft, and the discipline split proved |
| **run it** | depth accumulates per cycle; a crew on shifts | employment — positions, shifts, wages, the roster tick |
| **it dies** | ⭐⭐ flowing → pumped → stripper → abandoned, as a **CURVE** | the pressure read; and ⚠ an uncapped hole is a **liability** |
| **containment** | separate: oil + gas + water + sand, settled by standing | bulk + vessels |
| | the oil | ⭐ `oil-cask` / `lamp-oil-cask` **already ship** |
| | the gas | the **gasometer**, shipped by the fire build |
| | the brine, piped to the pan | ⭐ `watershed.md`'s **`Conduit`** ladder. ⚠ Three unrelated things are already called `Conduit` — name with care |
| **transport** | barrels on wagons | ⭐ `teamstering` ships; induced lanes, Route/Journey, the depot, the cost surface |
| | then the **pipeline** | `Conduit` again — and see below |
| **waste** | the fractions nobody buys; **produced water** | the fire risk · `contaminationAt` · the flare |

### The four findings worth building on

1. ⭐⭐⭐ **A drilling log is a map CLAIM.** Every hole ever drilled is a
   data point about the column, and a surveyor's real asset is *other
   people's logs*. The per-player map document already has the exact
   semantics: channels `walked` · `seen` · `searched` · **`published`**,
   where **claims append and nothing is corrected.** So a false log stays
   on the record for ever, publishing is a choice, and a kept secret has
   value — the surveyor's whole reputation economy, with no new substrate.
   ⚠ Candidate reuse, not verified: the map doc is per-player and about
   *place* knowledge. Check the fit before the requirements commit to it.
2. ⭐⭐ **Decline is a curve, not an event.** No *"depleted!"* notice ever
   fires. The player watches a pressure gauge fall and decides **when to
   stop paying for the well** — a business judgment rather than a
   notification, and the honest form of *legible before irreversible*.
3. ⭐⭐ **The pipeline obsoletes a shipped player trade.** Barrels leaked
   and cost more than the oil, so the pipeline wins — and the teamsters
   fought the real ones, with sabotage. `teamstering` is a shipped
   Discipline, so this is the first vertical where **an investment
   destroys a vocation whose practitioners have standing to object.** Same
   shape as kerosene ending the whale fishery; both land in a polity that
   has courts. ⚠ Price it deliberately at requirements — it is strong
   pedagogy and a real loss to whoever invested in the cart.
4. ⭐⭐⭐ **The same fluid is one well's product and another's poison.**
   Produced water rises as a well ages; dump it and it salts the soil and
   kills the reach. Brine is **money** at a salt well and a **disposal
   cost** at an oil well — identical material, opposite sign, decided
   entirely by what else came up the hole. The best teaching object in the
   vertical, and nobody authors a lesson about it.

⭐ **Two products, two failure modes, one technique.** Water ingress ruins
a brine well's concentration and an oil well does not care; a blowout is
the oil and gas failure and brine has no pressure to speak of. The same
hole, drilled the same way, fails differently depending on what is down
there — which is what makes the brine rung a *rung* rather than a
re-skin.

## ⭐⭐⭐ Drilling is EMPLOYING, not collaborative (2026-10-08)

User, having read the walkthrough: *"it sounds like drilling is
necessarily collaborative, for setting up the drill and then running the
pump afterwards."* Structurally true, and the framing matters enormously.

Every other RGO is one person converting **their own time**: one axe, one
rod, one hoe, one hand in the hive. Drilling needs a derrick raised, a
beam worked continuously and a cut/bail cycle running for weeks **before
anybody knows anything.**

⛔ But modelled as **collaboration** that is dead content — gated on how
many players are online simultaneously, which on a small server means
nobody ever drills. (The same hazard the inquiry slate names as its risk
2.) So:

> ⭐⭐⭐ **Drilling is not collaborative, it is EMPLOYING — and NPCs satisfy
> it.** What made oil different was never that you needed friends. It was
> that you needed a **payroll**.

That is historically exact *and* it is the capital shape this slate already
names: *"the whole cost is paid before you know anything"* — **the cost IS
the payroll.** It rides shipped machinery entirely: positions, shifts,
wages, `apply`, `clock on/off`, and the CALL (`call: regulars | rota`,
`callFor` over capability → your regular → the freest → rotation) with the
roster tick that relocates and covers.

- ⭐ **The first RGO where the act is somebody else's.** Every other
  converts *your* time into goods; drilling converts **money** into goods
  via **other people's** time. A genuinely new economic shape, and what
  makes drilling the right **capstone** to the roster rather than merely
  its last entry.
- ⭐⭐ **It mirrors foraging exactly.** Foraging: no capital, your own time,
  alone. Drilling: all capital, other people's time, a crew. **The two ends
  of the RGO ladder are the two ends of the labour axis** — which
  retroactively justifies designing the pair together.
- ⭐ **It gives the firm a reason to exist.** A partnership to spread the
  risk of a dry hole is why oil produced corporate forms, and Business
  Ideas + corpos ship.

## ⭐⭐ The pump — its own history (moved)

This section duplicated [pump-slate](../builds/pump-slate.md) nearly
verbatim and is cut to a pointer. The pump SHIPPED (the pump build,
2026-10-09): the wellhead's `liftL()` attach point was consumed exactly as
this slate said it would be — the bailer is still the rung below, and a
pump extends a well's economic life rather than unblocking drilling. See
[pump.md](../../subsystems/pump.md).


---

## ⚠ Tail — what the 2026-10-09 build shipped WITHOUT (MR !353)

Salvaged out of `drilling-plan.md` at that build's pre-merge sweep, when
the plan retired. Each of these was a deliberate non-goal with a
destination, not an oversight.

### ⛔ `cap` / `plug` — the liability nobody can discharge

An uncapped well **leaks** (W-B1 shipped the flowing well and the burnt
ground), and **nothing caps it.** So the realm now contains a thing that
can be abandoned in a state that costs everybody something, with no act
that stops it.

⭐ That is the interesting half and the reason it was left: *the polity
gets to price it.* A cap is cheap, a leak is diffuse, and the question of
who pays for an abandoned well is the sort a legal code is for rather
than a mechanism. But the verb has to exist before anybody can be made
to use it — see [verb-conferral's rule](../../subsystems/employment.md):
**the refusal is the progression UI**, and here there is not even a
refusal.

### Secondary recovery

Pressure falls, the well stops flowing, and the shipped answer is the
bailer and then nothing. Water flood / gas re-injection is the rung that
makes a declining field a capital decision rather than an ending. ⚠ It
wants the [pump slate](./pump-slate.md) first — you cannot re-inject
without a pump.

### ⚠⚠ The crew's RATE — measured, unexplained, deliberately untuned

**Two roustabouts on shift, a full game day, one metre.** Against
`CREW_SWINGS_PER_HOUR = 120` × 2 hands × 24 h and
`SWINGS_PER_METRE_REF = 6` that is an order of magnitude light, and
lining is **not** the gate (the Rejection deposit authors no
`waterTable`, so the default −45 puts the liner threshold at 45 m).

⭐ The suspect is `SAMPLE_CAP_S = 3600`: `Wellhead.reconcileRig` clamps
`elapsed` to one hour, so a clock **jump** is credited once rather than
replayed hour by hour. The cap is the right *shape* — it is what stops an
unobserved rig minting unbounded depth, and it is consistent with *depth
is BANKED, only the swing is ENGAGED* — but it makes the method's own
docstring claim (*"weeks pass with nobody reading"*) only partly true. A
shift window the jump lands outside of would compound it, since
`crewOnShift()` counts only hands actually on shift.

⚠ Which number is wrong — the cap, the swing rate, or the expectation —
is a **balance** question against a running game, and this project parks
rate tuning until there is one. ⭐ The drive asserts the mechanism (the
hole gets deeper and the reader never touches the beam) and deliberately
asserts no rate: *a rate nobody has tuned is not a mechanism, and a
checkpoint that asserts one fails for reasons that teach nothing.*

### The others, which already have homes

- **the pump** → [pump-slate](./pump-slate.md) (the wellhead's bailed
  rung is where a throughput plugs in)
- **compressed storage** (`maxPressureAtm`) →
  [destructive-distillation-slate](./destructive-distillation-slate.md)
- **the river leg** — a dumped liquid as a discharge from any shore: the
  `Conduit` sump, the derived `dischargeLoad` and a `'hydrocarbon'`
  contaminant kind → the watershed slate. ⭐ Withdrawn as **D17** because
  a trade build never solves a cross-cutting capability; AC 9's dump leg
  is recorded unmet.
- **`Still` promotion to the kernel** when a third pack names it
- **dip from the surface** — a `Deposit` decision the mining build made
  and this one left
- **the act/credit legs for every other RGO** →
  [field-substrate](./field-substrate-slate.md); the owner/crew split is
  implemented on the wellhead and the spine will want the same read
