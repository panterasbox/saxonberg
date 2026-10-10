# The pump — requirements

**Kind:** feature
**Leads from:** kernel · **first consumer, in this build:** a hand pump on
the village well at Rejection, a lift fitted to a brine wellhead that has
no head of its own, and the Wharfside city intake — whose pump has been
running in the prose since the water build and has never cost anybody a
watt.

A pump moves a **fluid from A to B against gravity**, and that is the
whole concept. It is in this backlog ahead of its competitors because it
has more waiting customers than anything else in it — the village well,
the mine sump, the oil lift, the brine line, the quarry pit, the bilge,
the diving hose and the fire engine are **one machine with different
numbers** — and because it carries the best teaching object we have: the
~10 m suction limit, which is arithmetic, is felt before it is
understood, and historically produced the steam engine. Seeded by
[pump-slate](../slates/builds/pump-slate.md), promoted out of
[mining-slate](../slates/builds/mining-slate.md) on 2026-10-08 after four
separate designs had each deferred it assuming it belonged to one of the
others.

---

## What already exists

⭐⭐⭐ **The headline physics already ships, and the slate says it does
not.** The slate's § *The limit* warns *"⚠ Not free: atmospheric pressure
is modelled NOWHERE — one constant has to be introduced."* That is wrong,
and wrong in the direction that makes this build **substantially
cheaper** than it was scored:

- `_defaultPressure: { value: 101325, unit: Pa }` ships on the root
  biome, beside `_defaultGravity` and `_defaultAtmosphere`, and all three
  are mandatory at boot.
- A place resolves its own pressure through the outward-walking biome
  chain, and ⭐ **pressure derives from a cause**: fall all the way to the
  root and `P = P_sea − ρ·g·h` answers from the zone's elevation, so a
  barometer reads a reason rather than a number an author typed.
- Weather deviates it, signed, and only the sign is load-bearing — a
  storm reads −2500 Pa.
- **Six consumers already read it**: the barometer, the altimeter, the
  elevation derivation, the weather field, bulk's gas-pressure rung, and
  vitals in mmHg.

⭐⭐ **And the suction limit is an expression the engine already
evaluates.** `measure altitude` computes `(P_sea − P_local) / (ρ·g)` from
exactly three reads — and `101325 / (1000 × 9.81) = 10.33 m`. The limit
is the altimeter's own arithmetic with sea-level pressure in the
numerator. It refuses in a vacuum today, which is the same refusal a
suction pump needs. **Nothing has to be introduced.**

⭐⭐ **And the pump's power bill ships too.** `watershed.md`: *"The pump is
hydro's equation read backwards — `ρ·g·Δh·Q/η`. ρ and g are reads, not
constants."* `requiresPump()` is a **terrain-derived predicate** (the sign
of `headM`, which nobody declares), `isGravityFed()` is its twin, and a
`waterPumpEfficiency` dial ships at 0.6. ⚠ **Nothing in production calls
it** — every call site of the watts function is a test.

**What a player can do today**

| | |
|---|---|
| raise a fluid against gravity | **exactly one verb**: `bail`, a leather bucket on a rope, 12 L at a time, at a bore |
| move a fluid otherwise | `fill` · `pour` · `spill` · `water` · `drink` — all downhill or hand-to-hand, over bulk slots |
| get water at all | from an **inexhaustible** fixture — a standpipe, a butt, a basin, a tap. None of them can run dry |
| operate a machine that moves water | **nothing, anywhere** |
| type `pump` | only at a lit, fuelled furnace. It works the bellows |

**What the fiction has already written down.** The absence is authored
into at least nine content files: the Ferrow winze foot (*"Nobody has
pumped this level in a long time"*), the Rejection adit (*"no hoist, **no
pump**, no drainage commons"*), the Hinkley district tank (*"those fifteen
metres ARE the pressure at the standpipe. **No pump**"*), the generic
basin (*"the finite, regenerating source that would make a **frontier
pump** mechanically different is already named as deferred"*), and above
all the city intake: *"a housing on the bank where the pump lives. **The
pump is running. The pump is always running.** The river is below the
city, so this runs or the city is dry."*

**The lift this build replaces is specified for us.** The bore's
`liftL()` returns one constant — a bailer-load — and the drilling doc
names it outright: *"a lift mechanism raising it is the pump build's
entire attach point."* `bail`'s own help already teaches the premise:
*"Brine at a hundred yards has to be lifted, a bucketful at a time, and
**that is the whole reason a pump was ever worth inventing.**"*

**Three Disciplines, all shipped, none to mint.** `physics` reads as if
written for this build — *"pressure, density, weight, current, **the head
on a water course**… which figure is a fact about the world and which is
a fact about the dial"*; `smithing` for the cylinder; `leatherwork` for
the packing. ⛔ There is **no** `engineering` and no `mechanics`
Discipline, and we are not minting one: the catalogue's rule is that a
Discipline is a field of study with a named ISCED-F code, not a job
title.

**One recurring-consumable precedent, and one cautionary tale.** The mine
timber set is the economy's single *placed component that decays in
service and creates a standing supply line* — it is an object not a flag,
`analyze` reads its condition, `repair` restores it, and a mine that runs
out has a supply problem. ⚠⚠ And lamp oil is the warning: its first cut
shipped the **money leg only**, so a parish paid for lighting while *"no
oil is consumed, no stock depletes, and no lamp-oil good exists"* — the
trade that should have been selling it saw none of the demand.

> **Therefore what is genuinely new here is** the machine itself and
> nothing underneath it: a thing with four numbers that raises a fluid,
> an honest ceiling on the cheap version of it, a leather part that wears
> out, two power sources that already exist attached to something that
> has never had power attached to it before, and the first fluid in this
> realm that comes up **continuously** instead of a bucket at a time.

---

## Goals

- ⭐⭐⭐ **A person can work a pump and water comes up.** The village well
  at Rejection has a handle, and working it fills a vessel — the first
  machine in the realm that moves water, and the first alternative to
  `bail` since `bail` shipped.
- ⭐⭐⭐ **The cheap pump has a ceiling, and the world announces it with a
  number and no explanation.** A suction pump stops delivering at about
  ten metres of lift. The player is told the water stops coming, and at
  what depth, and nothing tells them why. ⭐ The ceiling is **arithmetic
  over the pressure the place actually has**, never an authored dial — so
  a pump carried uphill lifts less, and nobody authored that either.
- ⭐⭐ **And the ceiling has an answer that is a different machine, not a
  bigger one.** The force pump puts the piston at the bottom and pushes;
  it lifts as high as its power allows and needs no new physics. The
  limit is therefore a **choice between two machines**, not a dead end.
- ⭐⭐ **A pump produces no good at all — it produces access.** Its output
  is *the well keeps producing*: a bore with no head of its own yields a
  continuous rate instead of twelve litres a haul, which extends a well's
  economic life rather than enabling it.
- ⭐⭐ **The seal wears, and somebody has to make another one.** Leather
  packing degrades in service, reads its condition under `analyze`, can
  be repaired, and eventually must be replaced — the second instance of
  the timber-set pattern, and a **repeat customer** for a tanning trade
  that today sells one hide per bailer and nothing twice.
- ⭐⭐ **Power is attached, not assumed, and two epochs ship at once** —
  a body at the frontier handle and the grid at the city intake, which is
  the same split the realm's street lighting already makes between a town
  that burns oil and a city that draws a feeder.
- ⭐⭐⭐ **The city's pump stops being free.** The Wharfside intake's watts
  become a real draw with a real source; and ⭐ **stopping it is an act
  against a city** — a tap above it reports an honest supply failure, and
  somebody can turn it back on. ⚠ **The vocabulary ships and the tap's
  reading of it does not**: the six supply words are kernel and precedence-
  ordered, but a water fixture today knows nothing about a main — it has
  no reference to a conduit, a supply or a service, and the one method
  that answers *does this serve that place* has **no caller in production
  anywhere**. So this goal is a genuine piece of wiring and not a
  presentation of something already built.
- ⭐ **A second pump anywhere is rows.** Five numbers — **mechanism**,
  lift, throughput, power, seal — so a hand pump, a sucker rod, a horse
  gin and a steam pump are all authored, not coded. ⭐⭐ **The mechanism
  is the one that carries a law**: it is what decides whether this
  machine has a ceiling, and it is why the other four cannot be the whole
  surface.

---

## Non-goals

- ⛔ **No mine dewatering, no drainage commons, no hoist toll.** ⚠ This is
  the slate's own preferred host and the survey refused it: **a mine has
  no water.** Wetness is a 0–1 stability input with no litres, no level,
  no flooding and nothing to bail, and `mining.md` states the boundary as
  a fact about the ground — *"an adit drains by gravity and the oxide cap
  sits above the water table, so there is no shaft, hoist, pump or
  drainage commons."* Dewatering needs mine flooding **invented first**,
  which is a build. → [mining-slate](../slates/builds/mining-slate.md)
  (which already says *"dewatering stays this slate's demand; the machine
  is that one's"*) and
  [metal-chain-slate](../slates/builds/metal-chain-slate.md), which owns
  the public-goods problem and whose *"the commons ships in v1"* decision
  is about **that** pump, not this one.
- ⛔ **No steam engine, no boiler, no prime mover.** ⚠ Nothing in the
  realm has one, no slate claims one, and the phrase *prime mover* appears
  nowhere in the corpus — yet it is this limit's historical payoff. →
  **a slate this build must open**, named in § *Deferred seams*.
- ⛔ **No animal and no water-wheel power rung.** Both are deferred for a
  reason that is structural rather than budgetary: animal traction
  attaches to a **cart** and nothing else, and the two water wheels in the
  game are a room detail and a turbine — there is no wheel a player can
  site or couple. Each lands when its attach exists. →
  [pump-slate](../slates/builds/pump-slate.md) § *The ladder*.
- ⛔ **No irrigation, no ditch company, no command area, no water law.** →
  [climate-and-water-requirements](./climate-and-water-requirements.md)
  and [rgo-unification-slate](../slates/builds/rgo-unification-slate.md)
  § *The pump breaks the tyranny of contour*, which already owns it.
- ⛔ **No finite aquifer.** Sources stay inexhaustible; the well does not
  draw down. → the deferral already named in the unbounded-source
  substrate and in the generic basin's own header.
- ⛔ **No diving, no bell, no hose.** →
  [navigable-water-slate](../slates/builds/navigable-water-slate.md),
  which calls the pump *"the gate for the whole diving ladder"*, and
  [underwater-slate](../slates/builds/underwater-slate.md), whose
  depth-derived pressure this build's reads would be the first consumer
  of.
- ⛔ **No fire engine.** →
  [cooperative-effort-slate](../slates/builds/cooperative-effort-slate.md),
  which lists *"the hand-pumped fire engine | a pressure head"*.
- ⛔ **No rubber.** Leather is not a placeholder; every pre-industrial
  pump in the world was leather-packed. Rubber is the seal's **upgrade**.
  → [rubber-slate](../slates/builds/rubber-slate.md), which already says
  *"gaskets belong to whoever builds the pump."*
- ⛔ **No discovery of the limit as a law.** The limit is felt, measured,
  and unexplained, and ⭐ an unexplained limit is not a betrayal — the
  fiction breaks when it is *inconsistent*, not when it is mysterious. →
  [inquiry-slate](../slates/builds/inquiry-slate.md), which ⚠ **does not
  know the pump exists** (its worked first case is vulcanization
  throughout) and which this build should seed with it.
- ⛔ **No screw and no centrifugal pump** — the two family-B-looking
  machines that are not this build's. ⭐ The Archimedes screw is a
  **family A bucket machine wearing a pipe**: it has no seal, develops no
  pressure and has no ceiling, so it belongs with the noria. The
  centrifugal has no piston at all, is the **industrial epoch**, and
  needs priming — which is a mechanic of its own and the thing that ended
  cooperative water management when it arrived. → the family A concept
  below, and [rgo-unification-slate](../slates/builds/rgo-unification-slate.md)
  for the centrifugal's economics.
- ⛔ **No metered power billing.** The grid draw is real; invoicing it is
  already Tier C elsewhere. → the power-utility slate.

---

## Placement

**The machine is kernel substrate; every pump in the world is a row.**

The four numbers and the lift act belong to the engine, for the same
reason the bulk substrate does: the customers have no common pack
ancestor. A bore is `trade-drilling`'s, a well is a locality's, an intake
is the water pack's, a sump will be `trade-mining`'s, and a bilge will be
maritime's. ⭐ Substrate goes to the kernel when its composers share no
pack — and five of the eight named customers live in five different
packs.

**What goes where**

| | |
|---|---|
| the displacement mechanism, the five numbers, the suction ceiling, the seal's wear | **kernel** |
| the unified `pump` verb and its interface | **kernel** (the platform pack's view) |
| the village well and its pump | **`rejection`** — a rows-only pack with no `src/`, which is the placement test passing: a second well anywhere needs zero code |
| the lift fitted to a bore | **`trade-drilling`**, over the attach point it already published |
| the city intake's real draw | **`terminus`** rows + the `water` pack's existing conduit, which ships **no verbs at all** and must keep shipping none |
| the seal as a made good | **`trade-tanning`** — one recipe, copying the bailer's |

⭐ **The verb's placement is the platform's and the collision is settled
at rung 1 of the ladder.** ⚠⚠ Two shipped documents disagree and the
requirements must pick: `watershed.md` ruled *"`pump` already ships — a
bellows verb on a furnace. A pumped conduit is powered machinery, not a
hand crank, so the build needs no pumping verb at all and `pump` is left
alone"*, while the pump slate leans *"the ladder's first rung — unify
behind an interface. A bellows and a lift pump are the same object, and
air is a fluid."*

**Both are right about their own rung, and the reconciliation is the
decision:**

- A **powered conduit** is machinery that runs. It needs no verb, and
  watershed's ruling stands untouched — the city intake is switched and
  billed, never worked.
- A **hand pump** is a bodily act: you move a piston with your arms, which
  is what the bellows verb already means.

So the verb is **unified behind an interface** — one `pump` view, one
controller, and the bellows becomes an implementation of it rather than
its definition. ⭐ **Lens 2 chose this limb**: with an interface a new
pump is a row, and the alternative — a second view claiming `pump` —
**shadows the first silently**, which is the named failure rung 2 exists
to avoid. ⛔ And arg alternation is not available: a `requires: A|B`
deletes a check rather than adding a branch.

---

## Collisions

| what | who already lives there | the ruling |
|---|---|---|
| ⚠⚠ **the `pump` verb** | the furnace bellows, as `verbs: [pump, work]`, `requires: BurnerMixin`, conferred only in `peers` | **unify behind an interface.** The bellows keeps working exactly as it does; `pump forge` must still read identically |
| ⚠⚠ **`drain`** | **mining's gas verb** — it draws firedamp out of a working into a *sealed* vessel. It is not water and it does no lifting | **do not touch it, and do not reach for the word.** A pump that "drains" something must say so in other words |
| ⚠ **the Wharfside intake** | the water pack's one pumped row, `headM` negative, `on: true`, with a `pump` room **detail** that is scenery | the detail becomes a thing with a draw. ⚠ The water pack ships **no controllers and no verbs** and must continue to |
| ⚠ **the Hinkley district tank** | a tower at 145 m whose own comment is *"those fifteen metres ARE the pressure at the standpipe. **No pump at all**"* | ⛔ **leave it gravity-fed.** It is the shipped counter-example and it teaches the lesson by contrast |
| ⚠ **`bail` and the bailer** | drilling's two-job verb — it clears the hole *and* lifts the product, and `bore` refuses to deepen until the hole is bailed | ⭐ **the bailer does not retire.** Bailing stays the way a hole is cleared and the way a well with no pump produces; the pump is a throughput upgrade on one of its two jobs |
| ⚠ **the Rejection adit and winze foot** | authored prose that says there is no pump and nobody has pumped this level in a long time | the **village well** is what ships here, above ground. The adit's prose stays true |
| ⚠ **the onsetter** | an NPC who *"used to work the cage and now works the door"* at a shaft that was abandoned | untouched. He is the hoist's redundancy, not the pump's |
| ⚠ **three things called `Conduit`** | the kernel's sensory pass-through, arcana's coupling item, and the water pack's conveyance | ⛔ **do not add a fourth.** Player-facing rows take real names — *the city intake*, *the village well* |
| ⚠ **the gym's vacant `pace` slot** | deliberately absent, waiting for the first device offering that capability, because *"a kind nothing in the world offers is a requirement nobody can satisfy"* | ⭐ a hand pump is sustained human work at a fixed machine. **Worth a look, not a goal** — if it falls out, the slot lands with it |

---

## Surface decisions

### Which customers lead

**The village well, the bore's lift, and the city intake.** Not the mine.
The slate leaned on dewatering as *"the oldest demand"* and the survey
found the mine has no water at all; the three chosen consumers each need
**no new hydrology** — one is new rows in a rows-only pack, one is an
attach point drilling already published and documented as ours, and one
is a shipped row with an inert watts function and three sentences of
prose about a pump that has never cost anything.

### ⭐⭐⭐ Two families, and the ceiling belongs to the mechanism

The slate describes one ladder — shadoof · screw · bucket chain · suction
pump · force pump · sucker rod — and asks as its first open question
*"is the pump `LiftMixin`, or its sibling?"*. Working through the actual
machines answers that question and splits the ladder in two, and the
split is load-bearing rather than tidy.

| family | how it moves fluid | lift is | seal | ceiling |
|---|---|---|---|---|
| **A · bucket machines** — shadoof, noria, bucket chain, the mine cage, the ore skip, ⭐ **and the bailer, which ships** | it **carries** the fluid or the load up inside a container | how far the mechanism reaches | none — a flap valve at most | ⛔ **none, at any depth** |
| **B · displacement machines** — suction pump, force pump, sucker rod, centrifugal, ⭐ **and the furnace bellows, which ships** | it **pushes** the fluid through a pipe | what the mechanism can develop | yes, and under pressure in the force case | ⚠ **only the suction variant** |

> ⭐⭐⭐ **The suction limit is therefore not a property of pumps. It is a
> property of pumps that PULL.** Sichuan lifted brine from three hundred
> metres with a bucket on a rope, and this realm already ships that
> bucket. If the ceiling lives on the *machine*, the first authored noria
> inherits a ten-metre cap that is **physically false** — and the lesson
> stops being a law and becomes a lie.

**So the ceiling is a consequence of the mechanism, declared nowhere and
authored never.** A row says which mechanism it is; whether it has a wall
follows.

⭐⭐ **And family A is `LiftMixin`'s, which is the answer to the slate's
Open #1.** A hoist raises a cage, and a cage is a container you put
things in — so the hoist, the skip, the noria, the shadoof and the bailer
are **one concept**, and it is a concept **three slates have already
named** (mining, metal-chain and rejection all spend `LiftMixin` on the
called cage and the ore skip). ⛔ **This build must not take that name**,
and the pump is its **sibling, not its instance**. ⚠ Nor may it add a
fourth meaning to *lift*, which already means the gym verb, the bore's
own lift act, and that unbuilt hoist — the three-`Conduit` problem,
caught early for once.

### Does the suction limit use the real atmosphere, or a constant?

**The real field, because it is already a field with six consumers.** The
slate asked this as an open question with a stated rule — *if two
consumers exist it is a field, if one it is a constant* — and the answer
turns out to be settled in advance. ⭐ The consequence is the best thing
in the build and nobody designed it: because pressure derives from
elevation, **the same pump lifts less on a hill**, and a player can read
both numbers on a barometer and watch the ceiling move.

### Does the governance half ship?

**The dependence ships; the politics do not.** ⭐⭐ The slate's strongest
lens is *"the pump is the first machine where stopping it is an act
against somebody else"*, and the survey found a venue for it that costs
almost nothing: the city intake already has a whole city downstream of
it, and the supply-failure vocabulary already carries `off` — *"somebody
closed it, and somebody can open it again."* So stopping the city's pump
makes the city's taps answer, honestly, in words that already exist.

⛔ What does **not** ship is the levy, the pump rate, striking a
free-rider off, and taking the pump private to abolish the commons. Those
are the polity's, not the code's, and the entrenchment tier says so.

### ⚠⚠ Two slates disagree about what a pump does to a commons

Recorded because it is a real contradiction and the build must not
inherit it unresolved. The pump slate says the pump **creates** a
commons: your mine's pump keeps the levels below yours dry, so stopping it
is a weapon. [rgo-unification-slate](../slates/builds/rgo-unification-slate.md)
says it **dissolves** one, and sharply — *"the gravity ditch forced
cooperation; the pump lets you defect… the institution was the thing
keeping the water allocated"*, with four centuries of acequia ended by
the centrifugal pump in one generation.

**Both are true, and which one happens is decided by whether the thing
the pump moves is shared.** A sump drains groundwater nobody can fence, so
one pump serves everyone and the problem is who pays. A farm well serves
one farm, so the pump is how you stop needing anybody. ⭐ **That is the
same machine producing dependence and destroying it**, and it is lens 4's
territory exactly: the engine can price both sides and cannot say who is
right. This build ships the shared case (the city) and leaves the private
case to the slate that owns irrigation.

### ⭐ The city intake is left overdrawn, deliberately

Decided by the user, 2026-10-09, after the plan surfaced it. The
intake's own authored numbers do not fit its own power band: five metres
of lift at its full capacity, through the shipped efficiency dial, asks
about **98 kW** against an industrial ceiling of **60**. So the pump will
deliver roughly **three-fifths of the capacity the row claims**, and the
instrument will say so.

**Leave it.** ⭐ A city whose water supply is capacity-limited by its own
power band — derived from numbers two different builds authored without
consulting each other, and reported honestly by a reading that already
ships — is the build teaching something nobody wrote down. ⛔ Do **not**
raise the band and do **not** lower the capacity to make the arithmetic
come out even; both are a row's worth of work and both would delete the
lesson.

⚠ What this does oblige: the shortfall must be **legible**, not silent. A
player who asks the instrument what the intake is doing has to be able to
find out that it is asking for more power than it is allowed.

### Does the bailer retire?

**No, and that is a design commitment, not a courtesy.** The decline
curve is *flowing → bailed → pumped → stripper → abandoned*, so the pump
**extends** a well's life rather than enabling it — and bailing remains
the only way to clear a hole, which is a job the pump does not do. ⭐ A
well without a pump is not abandoned; it is bailed.

### Is the seal a flag or a thing?

**A thing, placed, that wears in service** — the timber set's shape, not a
boolean. ⚠ Written against the lamp-oil failure: if the seal is a number
that ticks down with no good to buy, the tanning trade sees none of the
demand this build is supposed to create, and the whole recurring-consumable
goal is a money leg with nothing behind it.

---

## Lens pass

Against [design-lenses.md](../design-lenses.md). The slate ran the seven
on the *concept* and scored four at ⭐⭐⭐; this pass runs them on **this
scope**.

**1 · Pedagogy — ⭐⭐⭐.** The limit is derivable, measurable, felt before
understood, and now cheaper than scored: it is one expression over three
reads the engine already makes. Disciplines: `physics` (whose own
description names the head on a water course), `smithing`, `leatherwork`.
⭐ The world announces a law **by refusing, with a number** — *the water
stops coming at thirty feet and nobody knows why* — which is the honest
shape for a law nobody has discovered yet. ⭐⭐ And the families split
makes the lesson **completable**: *why does the bailer have no ceiling*
is answerable from the mechanism instead of standing as an exception the
player has to swallow.

**2 · Creative expression — ⭐⭐⭐, raised from the slate's ⭐⭐.** Putting
the ceiling on the **mechanism** rather than the machine is what buys the
third star: an author writes a force pump, a sucker rod or a bellows as
rows and **each gets the right physics**, where a ceiling on the machine
would hand all three a cap that is true of only one. ⭐ This limb decided
both forks in this doc — the verb's interface and the families split.

**3a · Immersion — ⭐⭐.** Raised from the slate's ⭐ by the altitude
consequence: the ceiling moving when you climb is the kind of coherence
that cannot be faked, and it arrives free. The mystery stays honest
because it is **consistent**.

**3b · Participation — ⭐⭐⭐.** A city depends on a pump nobody is paying
for. Shipping the dependence without the politics is what lets the polity
do something we did not design — levy for it, condition a lease on it, or
shut it off to win an argument.

**4 · Values — ⭐⭐⭐.** Two undecidable questions, and the second is
sharper than the slate framed it: *who pays for a pump others depend on*,
and *may you stop your own pump when stopping it dries a city*. Plus the
synthesis above — the same machine creates and destroys a commons
depending on what it moves, and the engine can price both and judge
neither.

**5 · Continuity — ⭐⭐⭐.** The pump spans every epoch and this build
ships two of them simultaneously at opposite ends of the realm. ⭐ It is
better than epoch-surviving, it is **epoch-causing** — and the one rung
we are *not* shipping is the engine the limit produced, which is the
clearest possible statement of why the limit matters.

**6 · Economy — ⭐⭐⭐.** Produces **access**, not a good. Consumes power
and **seals** — recurring demand, which this economy is short of. Demand
was there first and non-circularly: eight customers, five packs, nine
content files that mention its absence, before a single line is written.

**7 · Governance — ⭐.** Judges nobody; creates a **duty**. Criterion is
dependence, appeal is the courts, entrenchment is tier C. Derivative of
3b and 4, as the slate said.

**⭐⭐ Altitude.** **Invariant:** the suction ceiling, **and that it
belongs to the mechanism rather than the machine** — it is arithmetic over
the atmosphere, and an author who changes it is changing the air.
**Grain:** lift, throughput, power source, seal material, and the choice
to make the frontier hand-powered and the city grid-powered. **Title:**
who pays for a shared pump — we ship a dependence and no answer.

---

## The drive

Run against the running game at the end of the build phase, before the MR
opens.

1. **Go to the village well at Rejection and `look` at it.** Read what it
   is in words — a handle, a cylinder, leather in it — with no numbers.
2. **`pump well`.** Work it, and water comes up. `fill bucket from well`
   and carry water that a machine raised, which has never been possible.
3. **`measure pressure`** where you are standing. Then climb somewhere
   high, measure again, and **watch the number fall**.
4. **Try to lift from something deep** — a source more than ten metres
   down. Be refused, **with the depth in the refusal**, and with nothing
   anywhere telling you why ten metres is the number.
5. **Get a force pump onto the same source** and lift from it
   successfully. Nothing explains the difference; the machine simply
   works where the other did not.
6. **Pump until the leather goes.** `analyze` the pump and read its
   packing's condition in words — five words and no digit. `repair` it,
   and watch the words improve. Then **take a fresh packing and fit it**,
   and confirm the pump that had stopped working works again.
   ⚠ **Not *"wear it out past repairing"*, which this economy does not
   have**: `repair`'s own prose says gear never obsoletes, and nothing
   shipped makes a good unrepairable. Replacing a part is not the same
   claim as exhausting one, and this build is not the place to invent an
   irreparable state for a single good. ⚠ And the spare is **taken from a
   rack, not bought** — the mining town's till cannot take money (two
   drives have now recorded it), no tanner sells anywhere, and `make` is
   deed-gated. The **recipe ships for the trade**; the purchase is a
   retail defect older than this build and it is not this build's to
   fix.
7. **Go to a brine bore with no head of its own.** Bail it once and note
   what one haul gives you. Fit a pump, and get a **continuous rate**
   instead — then confirm `bail` still clears the hole, because `bore`
   still refuses to deepen through standing water.
8. **In Terminus, `analyze water the intake`** and read the kilowatts.
   Then find those watts drawn from something real, and confirm the
   aqueduct beside it — 1115 m of head, gravity-fed — draws **nothing**.
9. ⭐ **Switch the city's intake pump off.** Walk up into the city, try a
   tap, and be told the supply is **off** — in the shipped vocabulary,
   naming the state furthest from being fixed by the person asking. Then
   switch it back on and have the tap run.
10. **`pump forge`** at a lit furnace, and confirm the bellows reads and
    behaves exactly as it did before any of this existed.

---

## Acceptance criteria

1. A player can **work a pump with their hands** and put the water it
   raises into a vessel they carry.
2. A player who tries to suck water up more than about ten metres is
   **refused, and told the depth**, and can find no explanation anywhere
   in the game for why that depth.
3. The same pump at a **higher elevation lifts less**, and a player with a
   barometer can read both pressures and see why.
4. A **force pump lifts from a depth a suction pump refused**, with no new
   instrument and no explanation offered.
5. A pump's **leather packing visibly degrades in service**, reads its
   condition in words, can be repaired, and can be replaced by a part
   somebody **made from a hide**.
6. A **bore with no head of its own yields a continuous rate** once a pump
   is on it, and strictly more over the same span than bailing it.
7. **`bail` still clears a hole**, and `bore` still refuses to deepen
   through standing water.
8. The **city intake's pump draws real power from a real source**, and the
   gravity-fed aqueduct beside it draws none.
9. ⭐ **Stopping the city's pump is observable from a tap uphill** — the
   tap names the failure in the shipped supply vocabulary, and somebody
   can start the pump again and have the tap run. ⚠ A tap that reports
   this is **new**: no fixture in the realm reads a main today, so this
   criterion is satisfied by a tap that did not previously exist or did
   not previously know what fed it.
10. **`pump forge` is unchanged** — same prose, same toggle, same refusals
    for a cold, unfuelled or bellows-less furnace.
11. ⭐⭐ **A bucket still comes up from below the suction ceiling.** At a
    bore deeper than the depth a suction pump refused in criterion 2,
    `bail` still brings up its load — because carrying water up in a
    container was never subject to the limit, and nothing about shipping
    the limit may make the realm claim otherwise.
12. A **second pump anywhere in the realm is authored rows** and needs no
    new code, and a row says **which mechanism** it is rather than
    whether it has a ceiling.
13. The **Hinkley standpipe still runs on gravity** with no pump, and its
    fifteen metres of head still explain it.

---

## Cross-references

**Seeding slate** — [pump-slate](../slates/builds/pump-slate.md).
⚠ [drilling-slate](../slates/tails/drilling-slate.md) § *The pump — its
own history* duplicates the seeding slate's core almost verbatim and
should be cut to a pointer at the sweep.

**Slates holding adjacent design space** —
[mining-slate](../slates/builds/mining-slate.md) (dewatering's demand) ·
[metal-chain-slate](../slates/builds/metal-chain-slate.md) (the
public-goods problem, *"you can put a gate on a shaft, you cannot put a
gate on groundwater"*) ·
[rgo-unification-slate](../slates/builds/rgo-unification-slate.md) (the
pump against the commons) ·
[navigable-water-slate](../slates/builds/navigable-water-slate.md) (the
diving ladder, and *"three slates, one pump, nobody's"*) ·
[rubber-slate](../slates/builds/rubber-slate.md) (the seal's upgrade) ·
[bathroom-slate](../slates/builds/bathroom-slate.md) (the frontier water
gradient) ·
[cooperative-effort-slate](../slates/builds/cooperative-effort-slate.md)
(the fire engine) · [towns-slate](../slates/builds/towns-slate.md) (the
pump house and the tower) ·
[inquiry-slate](../slates/builds/inquiry-slate.md) (⚠ does not know the
pump exists).

**Subsystem docs** — [watershed.md](../subsystems/watershed.md) (the
conduit ladder, the equation, the verb ruling, the three `Conduit`s) ·
[drilling.md](../subsystems/drilling.md) (the attach point, the bailer,
the decline curve) · [mining.md](../subsystems/mining.md) (why there is no
water in a mine) · [biome.md](../subsystems/biome.md) (the pressure field
and its elevation derivation) · [bulk.md](../subsystems/bulk.md) (slots,
transfer, drain-through, unbounded sources) ·
[energy.md](../subsystems/energy.md) (the two epochs, the powered shape) ·
[exertion.md](../subsystems/exertion.md) (the work event, the gym's vacant
slot) · [maturation.md](../subsystems/maturation.md) +
[fractionation.md](../subsystems/fractionation.md) (the shipped patterns
for a machine that runs over time, and ⚠ *integrate the driver over its
trajectory, never sample it*) ·
[instrumentation.md](../subsystems/instrumentation.md) (the reading
ladder; competence resolves detail, never access) ·
[advancement.md](../subsystems/advancement.md) (why no new Discipline).

**Requirements in flight** —
[climate-and-water](./climate-and-water-requirements.md) (⭐ **descoped
the pump**, which is why this doc exists; still owns irrigation and water
law) · [maritime-space](./maritime-space-requirements.md) (owns the frame;
the bilge is its later customer) ·
[assembly](./assembly-requirements.md) (a pump is an assembled thing with
a mendable part — ⚠ name who ships the mend).

---

## Deferred seams

Each names where it lands; none is a stub.

- **The steam engine** — the limit's historical payoff, and ⚠ **nothing in
  the corpus claims it**: no slate, no doc, and the phrase *prime mover*
  appears nowhere. ⭐ **This build should open that slate**, because it is
  the one deferral whose absence is the point of the thing we are
  shipping.
- **The animal rung** (the horse gin) — blocked on an attach: traction
  couples to a cart and nothing else.
- **The water rung** (the wheel) — blocked on a sited, couplable wheel;
  today there is a room detail and a turbine.
- **Mine dewatering + the drainage commons + the levy** — blocked on mine
  flooding. → mining-slate, metal-chain-slate.
- **The finite aquifer** — the well that draws down. → the unbounded-source
  deferral already named in the substrate.
- **Depth-derived pressure** — underwater-slate's, and this build's reads
  are its first consumer.
- **The suction limit as a discoverable law** — → inquiry-slate, seeded by
  this build.
- **Metered power billing** for the intake's draw — → the power-utility
  slate.
