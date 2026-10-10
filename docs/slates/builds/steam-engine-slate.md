# Steam engine slate — the machine the suction limit produced

> **Status: UNBUILT**, opened 2026-10-09 out of the
> [pump](./pump-slate.md) requirements pass, which found that **nothing
> in this corpus claims the steam engine** — no slate, no subsystem doc,
> and the phrase *prime mover* appears nowhere in 289 slates — while the
> pump build is about to ship the limit whose answer it is.
> **Left:** ⭐⭐⭐ **the Carnot bound** as the second un-authorable
> invariant (and `arcane-science.md` has already ratified it for magic,
> so this is its first non-magical consumer) · ⭐⭐⭐ **shaft work as a
> coupling** — the thing nothing in the realm has, since traction
> couples to a cart and nothing else · the four rungs (atmospheric →
> separate condenser → high pressure → rotative) as rows · ⭐⭐ **fuel as
> a standing bill**, which is why the first engine belongs at a pithead
> and the second one does not · the boiler that can kill a bystander
> because its owner was cheap · ⭐ who is holding the obsolete half
> **Size:** a build, and possibly two — the coupling may want its own
> **Needs first:** the [pump](./pump-slate.md) (both the consumer and the
> limit), and a coal supply somebody digs

---

## ⭐⭐⭐ Why this is one object with the pump and not a sequel to it

The pump build ships a wall: a suction pump cannot lift water past about
ten metres, because that is one atmosphere expressed as a column of
water, and the player is told the water stops coming and never told why.

**The steam engine is the answer, and the answer is not a stronger
pump.** Newcomen's 1712 engine does not beat the ceiling by sucking
harder — it stops using the atmosphere to push *water* and starts using
it to push a *piston*. Steam fills a cylinder, a water spray condenses
it, and the atmosphere falls on the vacuum it left. The rod goes down,
the pump end of the beam comes up, and the depth of the mine stops being
a question about air pressure.

> ⭐⭐⭐ **The thing that could not be pumped produced the science that
> produced the engine that pumped it.** The ceiling is the reason
> Torricelli and Pascal went after the vacuum in the 1640s; that ran
> through Boyle to an engine invented for one job — getting water out of
> mines.

Which is why this slate exists the day the pump's requirements were
written rather than later: **the limit is only a lesson if its answer is
reachable.** Ship the wall with nothing behind it for too long and it
stops being pedagogy and becomes a dead end with good prose.

---

## ⭐⭐⭐ The Carnot bound — and it is already ratified

The pump build's best finding was that its headline physics was already
in the engine and the slate had said it was absent. **The same thing is
true here, and nobody has noticed.**

[arcane-science.md](../../arcane-science.md) already carries the Carnot
limit as **project doctrine**, applied to magic: the heat pump is
*"priced by Carnot"*, heat removal is *"**not a fixed η** — a Carnot
function of the lift"*, and the doc is explicit that *"there is no single
η"*. The cooking slate consumes it too — *"magical refrigeration is
Carnot-priced."*

> ⭐⭐⭐ **So the realm's magic already obeys the second law and its
> machines do not.** A steam engine would be the Carnot bound's first
> **non-magical** consumer, which is an unusually strong position to
> start a build from: the physics is decided, written down, defended in
> prose, and has a shipped consumer to be consistent with.

**The bound.** η ≤ 1 − T_cold / T_hot. Two temperatures, both of which
the thermal substrate already resolves, and a ceiling no amount of
engineering crosses.

⭐ **It is the exact sibling of the suction limit**, and the pairing is
the pedagogy:

| | the limit | where it comes from | what the player feels |
|---|---|---|---|
| **pump** | ~10 m of lift | the atmosphere where you stand | the water stops coming |
| **engine** | η ≤ 1 − T_c/T_h | the temperature difference you can make | the coal bill never falls past a floor |

Both are arithmetic over values the engine already has. Neither is an
authored dial. ⭐ And both **move with the world** — the pump's ceiling
falls when you climb, and the engine's ceiling rises when you can make a
hotter fire, which is the whole reason high-pressure steam was worth the
danger.

⚠ **Check before building, the way the pump build should have.** The
pump slate asserted that atmospheric pressure was modelled nowhere and it
had six consumers. Before this build designs a temperature, read
[thermal.md](../../subsystems/thermal.md) and
[fire.md](../../subsystems/fire.md) and find out what already resolves.

---

## ⭐⭐⭐ The real substrate is the coupling, not the boiler

A boiler is four numbers and some prose. **Shaft work is a hole in the
model**, and the pump build's survey is what exposed it:

- **Animal traction couples to a cart and nothing else.** The hauler
  capability lives on a person and on a draft animal, deliberately not on
  the rung between them, and what it attaches to is a *haulable vessel*.
  There is no hitch-to-a-fixed-machine anywhere.
- **The two water wheels in the realm are a room detail and a turbine.**
  One is scenery at a millsite; the other generates into the grid. ⛔
  Neither is a wheel a player can site, build, or couple to anything.
- **Human power is metabolic only.** The work event spends watts *on the
  body*; nothing in the game receives them. A barbell is the exemplar and
  the watts go nowhere by design.
- **The electric rung is the one thing that works** — a draw implements
  the powered shape structurally, and an appliance integrates a 0/1
  trajectory across an outage.

> ⭐⭐ **So the realm can power a lamp and a cold store and cannot power a
> machine.** Every prime mover in the power ladder — men, animal, water,
> steam — is missing the same piece, and it is not the mover. **It is the
> coupling.**

⭐ That is probably this slate's first wave and arguably its own build:
*a thing that makes shaft work, and a thing that consumes it, meeting
over one shape* — with the pump as the first consumer, a mill as the
second, and a hoist as the third. ⚠ The lesson to inherit from haulage is
**where the capability lands**: three answers to *can this drive a
machine* is what forced traction off the shared rung, and the old shared
rung gave a pit pony the ability to cast spells and hold a job.

---

## The four rungs, which should be rows

The pump's authoring surface is four numbers, and a hand pump, a horse
gin and a steam pump are all rows over it. ⭐ **Lean: the same here**, and
the rungs are historical rather than invented.

| rung | what changes | what it unlocks | the cost |
|---|---|---|---|
| **atmospheric (Newcomen)** | condense in the cylinder; the atmosphere does the work | **depth** — the mine stops being limited by air pressure | ~0.5 % efficient. Only economic where fuel is free |
| ⭐⭐ **separate condenser (Watt)** | the cylinder stops being cooled and reheated every stroke | ⭐⭐⭐ **geography** — the engine can leave the pithead | four or five times the fuel economy, and a patent |
| **high pressure (Trevithick)** | don't wait for the atmosphere; push with the steam | **size** — small enough to move itself | ⚠ the boiler can now kill people |
| **rotative** | reciprocation becomes rotation | **everything that is not a pump** — the mill, the loom, the hoist | gearing, and a flywheel |

⭐⭐ **And the second rung is the one that teaches the most, which is
counterintuitive.** Watt's condenser is not more power — it is *less
fuel*, and the thing less fuel buys is **somewhere else to stand**. An
atmospheric engine is economic only at a colliery, where the fuel is
spoil at the pithead and worth nothing to carry. Make it four times as
efficient and the engine can go where the *work* is instead of where the
*fuel* is.

> ⭐⭐⭐ **That is the geography of industrialisation, derivable, in one
> mechanism.** A water wheel ties a mill to a fall. The steam engine
> unties it — and the realm already ships the lesson's other half, since
> the millsite's own prose says a mill can only be *"at the FALL, which
> is the only place a mill can be."*

---

## ⭐⭐ Fuel is a standing bill, and the realm can already pay it

**Coal ships as a full material** — `heatOfCombustion: 28 MJ/kg`,
`autoignitionTemperature: 700`, its own `coal` tag so a firing can tell a
coal charge from a charcoal one, and `sulfurous`, which is what makes it
ruin iron and why coke had to be invented. Peat ships beside it. Both are
consumed by Rejection's businesses today.

And the realm ships the **pattern** for a machine with a standing fuel
bill: street lighting buys real lamp oil from a works, keeps it in a
store, and burns it a street-night at a time — *"a store run dry darkens
the junior streets first."*

⚠⚠ **And it ships the cautionary tale for getting it wrong.** Lighting's
first cut was the **money leg only**: a parish paid for lighting while no
oil was consumed, no stock depleted and no lamp-oil good existed, so the
trade that should have been selling it saw none of the demand. ⭐ **An
engine that burns a number instead of a good is that failure again**, and
it would waste the best thing this build has — a continuous, unglamorous,
never-finished demand for something somebody digs.

---

## ⭐ The boiler, and the first object that kills a bystander

A high-pressure boiler is the realm's first machine that can hurt
somebody who does not own it, was not working it, and made no choice
about it. The accountability ledger ships — harm and consent, derive-on-
read blame, producers rather than a chokepoint — so the mechanism for
*who answers for this* exists.

⚠ **But it only earns its governance if the owner had a real choice.**
The project's own rule is that a permissions system for a non-choice is
not worth building. Here the choice is genuine and it is a dial with
three honest readings: **more pressure is more work, less fuel, and a
worse accident.** That is a weighable trade, which is lens 4's
territory — so the criterion for an inspection regime would be real, the
appeal is the courts (which ship), and the entrenchment is the polity's.

⭐ Open, and the interesting part: **does the realm find out by
inspection or by explosion?** An inspection regime that exists before the
first accident is a polity being wise; one that arrives after is a polity
learning. The second is better content and the engine should not decide
it.

---

## ⭐ Who is holding the obsolete half

The pump slate recorded four people the lift ladder displaces — the
ferryman, the whaler, the iceman, the laundress — and the
[rgo-unification](./rgo-unification-slate.md) pass sharpened it: when the
pump obsoletes a *ditch company* the loss is worse than a livelihood,
because it is the only body that was allocating the water.

The engine's version is the nearest thing to hand and the realm already
has him: **the man on the windlass.** Bailing a well is slow and
labour-hungry and *it is somebody's job* — and the engine's whole
proposition is continuous and unattended. ⭐ So the first engine in the
realm is also the realm's first redundancy, and the design should know
whose it is before it ships one.

⚠ There is a shipped precedent for the shape, and it is already poignant:
Rejection's onsetter is *"the person who used to work the cage and now
works the door"* at a shaft that was abandoned. **The vocabulary outlives
the machine, and so does the man.**

---

## Open

1. ⭐⭐⭐ **Is the coupling this build's, or its own build first?** A
   prime mover with nothing to drive is the reference-Idea trap in
   mechanical clothing. Three consumers exist or are imminent (a pump, a
   mill, a hoist), which is the strongest argument for doing the coupling
   first and the engine second.
2. **Does the Carnot bound derive, or get declared?** Read the thermal
   and fire docs before answering — the pump build's lesson is that the
   answer is usually *it already derives*, and the slate that assumed
   otherwise was wrong by a factor of six consumers.
3. **Do you build an engine or buy one?** A ton of iron cannot land in a
   pocket. The derrick's precedent is that a frame is **raised by a siting
   act, not by `make`**, and the thing that affords the siting is a
   smaller tool — which also answers *who affords the verb*.
4. **What does the boiler failure look like, and does it need a new
   harm channel?** Steam is heat plus pressure, and the materials-response
   grid may already answer it.
5. **Which fuel, and does somebody dig it?** Coal is a material with no
   producer that the survey confirmed; a colliery Discipline exists with
   no colliery. ⚠ This may be a prerequisite rather than a detail.
6. **Does the engine get a verb at all?** ⭐ The pump build's ruling is
   the precedent and it cuts both ways: a hand pump is a bodily act and
   got the verb, a powered conduit is machinery that runs and got none.
   An engine is machinery — so lean **no new verb**: it is switched,
   fuelled, and read. `stoke` and `switch` both ship.

---

## Lens sketch

Not the full seven — that pass belongs to the requirements cycle. Three
readings worth recording now because they are what justifies the file.

- **Pedagogy — ⭐⭐⭐.** The Carnot bound is the second un-authorable
  invariant and the sibling of the suction limit; the condenser teaches
  that efficiency buys *geography*; `physics` ships as the Discipline and
  its own description already names pressure, power and the flow of
  water.
- **Continuity — ⭐⭐⭐.** This is the **hinge of the epoch ladder**, not a
  rung on it. Everything before it is powered by where it stands —
  muscle, a beast, a fall of water. Everything after is powered by what
  it can buy. ⭐ The same capability answers the same commands across the
  change, which is the test.
- **Economy — ⭐⭐⭐.** Produces **shaft work**, which nothing in the realm
  produces. Consumes **coal, continuously, forever** — and recurring
  demand is what this economy is shortest of. The demand is there first
  and non-circularly: the pump will be shipped and limited before this
  build starts.

---

See also: [pump-slate](./pump-slate.md) (**the parent** — the limit this
answers, and the first consumer) ·
[pump-requirements](../../requirements/pump-requirements.md) (the survey
that found this gap) · [mining-slate](./mining-slate.md) +
[metal-chain-slate](./metal-chain-slate.md) (dewatering, the coal→coke
transition, and the drainage commons this engine is historically *for*) ·
[rgo-unification-slate](./rgo-unification-slate.md) (who holds the
obsolete half) · [inquiry-slate](./inquiry-slate.md) (⚠ if the suction
limit becomes a discoverable law, **this** is what discovering it should
unlock — a different machine rather than a recipe) ·
[arcane-science.md](../../arcane-science.md) (the Carnot doctrine, already
ratified) · [energy.md](../../subsystems/energy.md) (the power economy and
the two epochs) · [thermal.md](../../subsystems/thermal.md) +
[fire.md](../../subsystems/fire.md) (what already resolves a temperature) ·
[conveyance.md](../../subsystems/conveyance.md) (why traction couples to a
cart and nothing else) ·
[accountability.md](../../subsystems/accountability.md) (the ledger a
boiler would answer to).
