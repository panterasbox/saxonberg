# Fire — the third product of combustion — requirements

**Kind:** feature
**Leads from:** kernel — a burning thing must know *what* it is burning,
and a scope's medium must be able to carry *how much* of something,
before any of the content below can be a row. ⚠ **First consumers, in
this build, both already shipped:** `trade-fuel`'s collier (the clamp
becomes a retort and stops throwing the valuable half away) and
`trade-mining`'s working (a heading accumulates firedamp). A third,
`trade-smelting`, consumes the output the day it lands: coke, and no
more hot-short bloom.

Combustion makes three things — **heat, light and exhaust**. The engine
models heat properly (real tabulated material numbers, an honest
ignition balance, phase change, spread through open boundaries only) and
light properly (the brand → tallow → candle → oil → gas → electric
ladder, per-viewer perception, flux gated on being lit). It models
exhaust as **one word**: a scope is `air` *or* it is `smoke`, chosen from
a fixed list, with no notion of how much. This build is the third
product.

Everything else here follows from that one gap. A retort is not a new
machine — it is **catching the exhaust instead of losing it**, and the
charcoal clamp's own description already narrates the loss: *"thin blue
smoke comes out of them and nothing else does."* Firedamp is exhaust
that arrives on its own. Coal gas is exhaust worth selling. The
gasometer is exhaust in a vessel. The peat smoke in a malt kiln is
exhaust landing on a grain — which this project **declared** three days
ago because it could not derive it.

Seeded by [fire-combustion-slate](../slates/builds/fire-combustion-slate.md)
(the refuellable burner and the burner that knows its fuel, both filed
2026-10-06 out of the whiskey drives),
[destructive-distillation-slate](../slates/builds/destructive-distillation-slate.md)
Stage A, and [mining-slate](../slates/builds/mining-slate.md) § the
fluid pass. ⭐ It is **not** a mining build and not a trade build; mining
is one of four expressions.

---

## What already exists

The survey ran across verbs, packs, subsystem docs, Disciplines and 284
slates. It shrank this build more than any survey has.

**The machinery is almost entirely built:**

- ⭐⭐⭐ **A chamber you load, whose charge decides the product, shipped
  with the extraction build.** `fire`/`burn` — *"Fire a loaded chamber
  and see what the heat makes of it."* The controller names no material:
  it reads what is in the chamber and asks which firing row that charge
  satisfies, with the yield ratio authored too. Its own note says *"a
  pack that ships a glass batch or a crucible charge ships a recipe row
  and this file never learns the word."* **The retort needs no verb.**
- **Pyrolysis is already the fuel trade's definition**: *"burn matter in
  starved air, the volatiles leave, the carbon stays — wood in, charcoal
  out (**coal in, coke out, later**)."* Coke is pre-declared as the next
  rung of a craft that ships.
- **The collier** ships whole: the clamp, the draught decision (a band,
  not a roll — too much air gives ash, too little gives brands), three
  outcomes, a `colliery` Discipline, and a losable burn.
- **The smelter's coke hook is already in place.** Fuel is found by
  material tag, never by name; coal carries `sulfurous` and routes the
  run to a hot-short bloom whose own row says *"an author who ships a
  way past it (coke) ships a row of their own and this one stops being
  reached."*
- **Smoke is already an atmosphere** with real numbers, turning a scope
  un-breathable, asphyxiating through the shipped respiration crisis,
  and folding carbon monoxide into the breather's **metabolism toxin
  burden**. An enclosed fire already kills by CO, not flame.
- **The two damps** (`blackdamp` suffocating and odourless, `stinkdamp`
  reeking) with the canary reading the one a nose cannot, an
  `atmosphere` reading channel, and a gas-analyser instrument.
- **A vessel's closure scale** `open < liquidTight < sealed`, with
  `sealed` already authored on several rows for carbonation — its *gas*
  meaning the one part declared and unexercised.
- **Lamp oil ships end to end**: a material, a cask, an oil works that
  produces it in the Terminus goods yards, a fuel store that burns it a
  street-night at a time, and a parish government at Heart's Delight
  that buys it through the shipped procurement loop. ⭐ Its keywords
  already include **kerosene**.
- **An enclosure declaration** — the author names a real material and a
  thickness and the physics comes off the material row; authoring an
  *effect* is lint-refused.
- **The cuts rung**, shipped with whiskey: ordered fractions over the
  volume drawn, each with a character, a grade band and a carry.
- ⭐ **A retort already stands in the world as scenery** at the Oil
  Works — *"a squat retort standing cold in the corner (the crafted
  route is a later build)"* — and five separate places in the content
  tree say that route is this build.

**What does not exist, verified three ways:** no tar, pitch, naphtha,
creosote, phenol or coke anywhere, as material, good or recipe. No
firedamp, anywhere, in code or content. No gas as a material, no gas
phase on any row, no gas as a good, no gas pressure. No condenser. No
gasometer. No flammability limits. No way to put fuel into a fire. And
no way for anything to know what a fire is burning.

> **Therefore what is genuinely new here is:** that a fire knows its
> charge and can be fed; that a scope's medium carries *amounts* of
> things rather than one word; and that combustion's volatiles become
> real matter which can be caught, stored, burned, sold, or breathed by
> mistake. Everything else named in this document is a row.

---

## Goals

- **A fire knows what it is burning.** A burner's fuel is matter with an
  identity, not a percentage — so what comes off a fire is derivable
  from what went in.
- **A fire can be fed.** Fuel can be added to a burner that is alight
  or cold, so no fire in the world is one-shot.
- **A scope's medium carries amounts.** What is in the air is a set of
  substances with concentrations, not a single word, so *a little* and
  *a lot* are different facts and a mixture is expressible.
- ⭐ **Gas is measured per volume, never as a fill fraction** — so that
  pressure is a derivable consequence of the model rather than a later
  addition. This is the one constraint the drilling vertical imposes,
  and it is load-bearing: a gas well is driven by pressure and its only
  depletion signal is pressure falling.
- **Combustion's volatiles are real matter.** They leave the fire, and
  where they go depends on what is there to receive them: a vessel
  catches them, a closed room fills with them, an open one loses them.
- **The volatiles are worth something**: wood tar boiling down to pitch,
  coke that does not ruin iron, and coal gas that a lamp will burn and a
  vessel must be sealed to hold.
- **A working accumulates firedamp**, which suffocates like the damps
  that ship and, unlike them, **catches fire** — so the lamp in your
  hand is the hazard.
- **A gas is storable and therefore sellable**, with a gasometer whose
  level anyone can read without a number.
- **The peat smoke in a malt kiln derives** instead of being declared,
  and a sodden turf refuses on its own moisture instead of being
  silently accepted.

## Non-goals

- ⛔ **The flue, the stack, and smoke moving between rooms.** → the
  [structures-slate](../slates/builds/structures-slate.md), whose own
  justification test names *"a chimney or a flue serving more than one
  hearth"* and *"vertical heat, smoke and sound"* as its leading passing
  candidates. A stack serving two hearths needs an owner above the room,
  and building that here would be solving a cross-cutting capability
  inside a feature build. Ordinary fire spread already emerges from the
  boundary graph and needs nothing.
- ⛔ **The standing fuel-load / dryness of a place** — the field that
  would make a forest in August differ from one in March. → the
  [fire-combustion-slate](../slates/builds/fire-combustion-slate.md)
  with the brigade. It produces and consumes nothing until somebody
  fights fires.
- ⛔ **The fire service**: the brigade ladder, fire code, inspection,
  insurance, arson and investigation, map-scale wildfire. → already
  designed in
  [fire-combustion-slate](../slates/builds/fire-combustion-slate.md).
- ⛔ **Mine flooding, bailing and the pump.** → the
  [mining-slate](../slates/builds/mining-slate.md)'s below-the-water-table
  stage, with the economics in
  [metal-chain-slate](../slates/builds/metal-chain-slate.md) and the
  seal in [rubber-slate](../slates/builds/rubber-slate.md). Water in a
  working produces nothing, its remedy ladder tops out at a pump that
  needs a material we cannot make, and it shares only the word *fluid*
  with this build's subject. ⭐ The liquid this build *does* exercise is
  the condensate.
- ⛔ **The first plastic / the thermoset.** → the same slate's Stage B,
  gated on the epoch on-ramp
  ([inquiry-slate](../slates/builds/inquiry-slate.md)). It is the one
  rung of destructive distillation that is knowledge-by-law.
- ⛔ **Aniline dyes and the dyer's disruption.** → `trade-dyeing`'s own
  follow-on. The seam is already authored: madder's row says *"where it
  came from — a bed, a field, **or one day a retort** — is upstream and
  none of dyeing's business."*
- ⛔ **A piped gas main, metered gas billing, and migrating a town's
  street lighting from oil to gas.** → the
  [power-utility-slate](../slates/builds/power-utility-slate.md) and
  [grid-slate](../slates/builds/grid-slate.md), where *"gas as a second
  piped commodity"* is already a deferred seam. This build sells gas in
  a vessel, not through a pipe.
- ⛔ **Pyroligneous acid, methanol and acetone.** Nowhere,
  deliberately — the demand test refuses them, they have no consumer,
  and tar alone carries the rung.
- ⛔ **Generalising the shell / building condition, and any second
  condition clock for fire damage.** → `holding.md` states that
  conversation needs its second consumer in the room and says not to
  have it alone. Fire damage, when it lands, reuses shipped condition:
  *fire produces repair bills, not craters.*
- ⛔ **Tar having a smell.** → the
  [non-visual-senses-slate](../slates/builds/non-visual-senses-slate.md).
  The aroma vocabulary is closed at eleven words, `tar` is not among
  them, and the gate that makes adding a twelfth expensive shipped three
  days ago. Spending its budget in the first build after building it
  would be the exact behaviour it exists to prevent.
- ⛔ **A new Discipline.** `colliery` already *is* this craft — this
  world's collier is unambiguously the charcoal-burner, and the fuel
  trade's own definition already covers *coal in, coke out*. Nowhere,
  deliberately.

---

## Placement

**Kernel**, for the substrate: a fire knowing its fuel, a medium
carrying concentrations, and volatiles as matter are all facts about how
the world works, composed by classes that already live in the kernel
(the forge, the oven, the hearth, the lamp, the campfire, the clamp) and
read by two packs that cannot depend on each other.

**The content is each trade's own**, under the root it already owns:

| content | pack |
|---|---|
| the retort, the condenser, wood tar, pitch, coke, coal gas | `trade-fuel` — the retort is the clamp's **capitalised sibling**, not a new trade |
| firedamp in a working, and reading it | `trade-mining` |
| coke as a furnace charge that does not ruin iron | `trade-smelting` (a row; its refusal path already anticipates this) |
| the gasometer | `trade-fuel`, as the works' object |

⭐ **The second-instance test passes:** a second retort, a second
gasometer, a second gassy mine is a row. A second *gasworks* — a town
with its own institutions around gas — is `/system/fire`'s, and that
pack does not exist and is not justified yet. The test for when: the
moment a realm wants its own brigade or gas undertaking with different
institutions. Fire's **physics** stays kernel for the same reason
water's precipitation integral did.

⚠ **No new namespace root, and no new Mongo collection.**

---

## Collisions

- **The Terminus Oil Works** already has a cold retort in its floor
  description and spawns lamp-oil casks as floor stock. This build makes
  that retort real, which means the room's prose and the works' stock
  story both have to stop saying *later*. ⭐ The works, its outfit and
  its hand already exist — this build gives them something to do rather
  than adding a venue.
- **The collier's fuel yard** — the clamp coexists with the retort by
  decision (below), so the yard gains an object and loses nothing.
- **Heart's Delight** is the gas-lit town whose parish government buys
  oil. ⚠ Its lighting must keep working exactly as it does; migrating it
  to real gas is out of scope and belongs to the utility slate.
- **The Hearthworks' sealed cellar** is the shipped lesson about
  enclosure and bad air. It is also where *"run a retort in a closed
  room"* will be learned, so it should be checked rather than changed.
- ⚠ **The campus-farm slurry pit** is the one authored `stinkdamp` row
  in the game, and the biome rows author plain `air` deliberately
  (*"foul air is NOT a biome fact"*). Both must keep resolving
  identically — see acceptance.
- **The malt kiln at the distillery** is the place the peat hack lives;
  this build makes its smoke derivable. The whiskey drives are the
  regression surface.
- **The canary** reads the air at Ferrow. Firedamp arriving must not
  make the bird's reading dishonest, and the canary must not become the
  *only* way to know — it is the free reading of the **odourless** damp,
  and firedamp's own tell should differ.
- ⚠ **Both whiskey drives are marked dirty specifically because no
  burner can be refuelled.** Fixing that is expected to let them run
  twice, which is a visible outcome this build should claim.

---

## Surface decisions

### The retort coexists with the clamp

The clamp stays the poor collier's kit. A retort is built, costs capital
and pays back only if somebody wants the byproducts — so choosing
between them is the business-ladder lesson arriving inside one trade. ⭐
A retort that strictly dominated would delete a shipped decision (the
draught call) and make the trade's existing judgment worthless.

### Uncaptured volatiles go into the air of the room

Not up an abstract chimney, and not nowhere. With a condenser attached
they are caught; without one they enter the scope's medium, which is
already un-breathable and already asphyxiates. ⭐ So *"run a retort in a
closed space and you poison yourself"* is emergent rather than
authored, and a chimney — later, owned by a building — becomes purely
additive: an object that vents a room's medium to the outside.

### Gas is measured per volume, and pressure derives

*How much of a substance per unit of medium* is the measure, never *how
full is the vessel*. A fill fraction cannot answer *"how much is in
there"* honestly for a compressible fluid, and it would leave a gas well
with no driver and no depletion signal — so the drilling vertical would
need a second gas model, which is precisely the *two parallel gas
economies* both slates warn against. ⭐ Measured intensively, total
pressure is a consequence of the mixture, and the gasometer's rising
bell is an honest readout of it.

### The medium's identity and its contents are two different facts

What the medium **is** stays what it is today — a named thing, authored
on rows that ship. What it **carries** is new and sits beside it. This
is the same rule the whiskey build settled for liquids (*what a thing is
is a material; how much of something it carries is a concentration*),
and it is what lets the existing authored atmospheres keep working
untouched, with no migration. ⚠ It also means the two damps can later be
re-expressed as *air carrying something* without breaking the row that
authored the word.

### Firedamp suffocates **and** catches fire

A gas that only suffocates would duplicate blackdamp and not be worth
adding; the explosive damp is the whole point, and it is the one that is
also a fuel. So it ignites on contact with an open flame above a
concentration — one threshold, not a full flammability-limits model.
⭐ That makes **the lamp in your hand the hazard**, which is the real
history and the reason the safety lamp was invented. ⚠ Its tell must not
be the canary (that bird is the odourless damp's free reading); firedamp
should announce itself differently or not at all, and deciding which is
part of the build.

### The arc stops at *collect*, and the collecting is a mine act

*A gas that kills you → a gas you vent → a gas you collect.* All three
rungs are in scope, because the third is what makes the hazard a
resource and the inversion is the lesson: **a hazard that turns out to
be valuable**, rather than a resource that happens to be dangerous.
Draining ahead of the face is the mine's own act, not a well.

### Coke's row ships here; coke's economics stay with the metal chain

Two slates claim coke and they claim different things. The **row** — a
fuel that does not ruin iron — is a retort product and belongs with the
retort, where the smelter's refusal path is already waiting for it. The
**arc** — the industrialised mine that burns coal it digs itself and
stops needing the forest — stays the metal chain's. Both are true and
they do not overlap.

### The gasometer is the works' object, not the town's

It is built, owned and read by whoever makes gas. ⭐ Its level is
visible and carries no number — a public, honest readout of a shared
stock that anybody can look at. Who *governs* a town's gas supply is the
utility slate's question and this build does not open it.

### ⚠ "Gas-lit" currently means oil-lit, and must stop

A locality's derived epoch reads *gas-lit if it burns oil*. Once real
gas exists that readout is a lie. The word has to move to the thing it
names; the oil epoch needs its own honest word. This is a renaming, not
a mechanism, and it is in scope because this build is what makes it
false.

### Magical fire obeys the oxygen leg and makes no exhaust

A conjured fire injects heat into the shipped physics — it does not get
a damage path of its own. Two consequences fall out and both are kept:
a fire in a sealed space **consumes the air and smothers**, conjured or
not, because conservation holds globally; and a fire with **no fuel
makes no exhaust**, so ⭐ **smoke is the tell that distinguishes a real
fire from a worked one.** Nobody has to author either.

### Forward compatibility with Structures, stated as a constraint

Structures will be justified eventually — a shared roof, a stack, the
building as a unit of repair and condemnation, and a place to say what a
building is made of, which is what paying for buildings in real
materials needs. ⚠ *Per-room enclosure already answers the physics
correctly and will keep doing so; what is homeless is the building's
bill of materials, and that is not this build's.* So this build must
leave that door open:

1. the medium's contents resolve through the **same outward walk** the
   medium already uses, so a building tier can later sit between a room
   and its zone;
2. nothing transports a medium **between** scopes;
3. a flue or chimney, if one ever appears, is an **object** — because
   re-parenting an object is a move and migrating a room's field is a
   migration, and this project does not do migrations;
4. building condition is not touched, and no second condition clock is
   introduced.

⭐ The dividend: every fire question deferred here lands on Structures'
justification pile as **evidence** rather than being guessed at now.

---

## Lens pass

**1 · Pedagogy.** Disciplines exercised: `colliery` (dominant — the
whole build is the collier's craft, upgraded), `mining` and `smelting`
secondarily; no new one, and that is the honest answer rather than a
gap. ⭐⭐ **What becomes derivable is the point.** Today a kiln's smoke
flavouring a malt is *declared* by a recipe, because nothing in the
engine knows what the kiln is burning — *"two fires in the fiction, one
in the model."* After this build the player can reason: *this fire is
burning peat, peat smoke is what comes off peat, the smoke is in the
barley* — and be right, without looking anything up. That is the
complexity-that-arises rather than complexity-written-into-the-rules,
and it is the lens's own test. The real chemistry is honest too: starve
a fire of air and you get the volatiles plus carbon, which is what a
retort is for and what a clamp throws away.

**2 · Expression.** ⭐ The ordinary case costs nothing: a material that
gives off nothing authors nothing, which is every material in the game
today. The bespoke case is a **row** — a new fuel declares what comes
off it, a new firing declares its charge and yield, a new gas declares
what it does to a breather. ⚠ The thing to protect is that a pack must
never need a kernel list edit to add a gas; the medium's contents being
a set of named substances rather than a fixed word is exactly what
buys that, and it is a gate's worth of pressure in the right direction.

**3a · Immersion.** The fiction currently betrays itself in two visible
places and both close here: a clamp whose description says the volatiles
leave while nothing receives them, and a retort standing in a room that
nobody can use. ⚠ The risk the build introduces: a room filling with
exhaust must be **noticeable before it is lethal**, or a player
suffocates in a workshop with no warning. The shipped respiration crisis
gives bands and a free continuous warning; the build must not bypass
them. ⭐ And no digit may reach any reading — a gasometer's level, a
working's air and a fire's smoke are all words.

**3b · Participation.** The role this opens is the one the world already
advertises and cannot staff: **somebody who runs a retort** — and the
Oil Works has an outfit, a hand and floor stock waiting for it. ⚠ By the
five criteria it is an upper rung of an existing trade rather than a new
vocation, which is correct and deliberate: the collier is the ladder,
the retort is its capitalised rung. Can the polity do something we did
not want? ⭐ Yes, and cheaply: a gasometer's level is public, so a town
can *see* another party's stock and act on it — hoard, undercut, or
refuse to supply — with nothing authored about any of that.

**4 · Values.** ⭐⭐ The undecidable this build forces is **what a town
does about a stock everybody can see and one party owns.** A visible
gasometer converts *"are we running out?"* from a rumour into a shared
observation, which is the gauge move — but it deliberately stops there:
the engine makes the depletion **legible**, and whether anything should
*stop* it is the polity's. ⚠ Named as the **grain**, not an invariant: a
world is welcome to a private, unreadable works, and the substrate is
*for* the visible one. The second undecidable is smaller and the same
shape: a retort run indoors is dangerous, and whether that is anyone's
business but the operator's is a local question.

**5 · Continuity.** The sharpest lens here, and it is what the drilling
constraint comes from. The same substance, measured the same way,
answers the same commands across three epochs: a nose bands it, a
gas-analyser reads it as a number, and an industrial instrument reads it
more precisely — the shipped instrument-ceiling ladder, unchanged. ⭐ And
the mechanism is feedstock-agnostic by construction: **wood in a retort,
coal in a retort, and crude in a column are one mechanism with three
charges**, which is why refining needs no new machinery and why this
build pre-builds the gas half of the drilling vertical. The test passes:
a gas from a well answers the same commands as a gas from a retort,
because neither knows where it came from. ⚠ The failure mode to refuse
by name is a fill fraction, which would be modelled at the level of the
*vessel* instead of the level of the *physics* and would have to be
rewritten rather than re-parameterised for a well.

**6 · Economy.** Produces: tar, pitch, coke, coal gas — and a reason for
the oil works to exist. Consumes: wood, coal, and the capital to build a
retort instead of a clamp. Who pays: the smelter pays for coke because
it ruins less iron; a lamp-owner pays for gas; and ⭐ **the demand was
there first and is already paying someone** — street lighting runs, a
parish treasury buys fuel through a shipped procurement loop, and the
smelter's hot-short refusal is a standing complaint with no remedy.
⭐⭐ The build also closes a named hole rather than opening one: *"nothing
refuels a furnace — a furnace is a consumer with no supplier."* ⚠ And it
is the first time a new technology **undercuts a shipped player
vocation** (wood tar against the tapper's pitch); that is already
reconciled as an **epoch pair rather than a conflict** — same product,
two technologies, different feedstocks — and the pacing is a polity
matter, not a dial.

**7 · Governance.** ⭐ Does not bite, and keeping it that way is a
decision. Nothing here judges a person: the gasometer measures a stock,
not an owner; the retort indoors is a hazard, not an offence. The
governance questions this build's outputs invite — who may run a works
in a town, whether a dangerous trade can be zoned, who answers for a
poisoned street — all belong to the fire service, the utility and the
zoning slates, and arrive with an appeal and an entrenchment tier when
they do. ⚠ The gap recorded as a gap: *collecting* firedamp in a mine
touches the drainage commons' free-rider shape (a gas you vent helps
your neighbour; a gas you collect does not), and that argument lives in
the metal chain's economics. This build must not pre-empt it.

---

## The drive

What a person does, in order, in the live game. Run at the end of the
build phase, before the MR opens.

**Part 1 — a fire that knows its fuel, and can be fed**

1. Find a lit burner that has been running — the still at Crowsfoot, or
   a forge. `look` at it. It should say what it is burning, in words.
2. **Stoke it** with the wrong thing (a stone, a wet log). It should
   refuse, in its own words, naming the reason.
3. Stoke it with cordwood. The refusal lifts; the fire keeps going.
4. Let it burn out. Stoke it cold, light it again. ⭐ It runs a second
   time — which no fire in the game can do today.

**Part 2 — the clamp, then the retort**

5. At the fuel yard, run a charcoal burn in the clamp as the collier
   does today: load cordwood, `char` it, set the draught in the band,
   wait, open it. Charcoal, as before. **Nothing else** — and the
   description still says the smoke went out of the vents.
6. Load the **retort** with the same cordwood and fire it with **no
   condenser attached**. Char comes out. Look at the room: the air has
   gone bad, and `measure` the atmosphere — it reports what is in it, in
   words, no number.
7. Leave. The air clears. ⭐ Do the same in a **closed** space and stay:
   the respiration warning bands arrive *before* anything lethal does.
8. Attach the condenser. Fire it again. Now you get char **and** a
   liquid in the receiving vessel. `look` at it: wood tar.
9. Boil the tar down. It becomes **pitch**.

**Part 3 — coal, and the three products**

10. Charge the retort with **coal** instead. Fire it. You get **coke**,
    **coal tar**, and a **gas**.
11. Try to hold the gas in an open vessel, then a liquid-tight one. Both
    refuse or lose it, in words that say why. Put it in a **sealed** one:
    it holds.
12. Take the coke to the smelter and run a charge. ⭐ It smelts, and
    **no hot-short bloom** — the shipped refusal path stops being
    reached.

**Part 4 — the gasometer and the lamp**

13. Pour the gas into the **gasometer**. Its bell rises. Read it from
    across the yard: a level, in words, with no number anywhere.
14. Fill a lamp from it and `ignite`. ⭐ It burns gas. Douse it; it stops.
15. Draw the gasometer down and read it again. The level falls. Anyone
    standing in the yard can read the same thing you can.

**Part 5 — the mine**

16. Go to Ferrow and drive a heading in. Work it until it is deep.
17. `measure` the atmosphere as you go. ⭐ A gas is accumulating, and it
    is **not** one of the two that ship.
18. Check the canary. It should **not** be the thing that tells you —
    this damp has its own tell.
19. Carry an **open flame** into the gassy heading. ⛔ It ignites. You
    should be hurt, and you should have had a way to know.
20. Hole the heading through to air. The gas clears, as the shipped
    atmosphere derive already does for blackdamp.
21. Drain the gas ahead of the face instead, into a sealed vessel. ⭐ The
    thing that was trying to kill you is now stock you can carry to the
    gasometer.

**Part 6 — the regression that matters**

22. Run the whiskey drive's peated malt: kiln barley over **peat**.
    ⭐ The smoke in the barley now comes from the *fire*, not from a
    declared recipe field — and kilning over plain wood gives
    unpeated malt with no recipe change.
23. Try to kiln over a **sodden, freshly-cut turf**. ⭐ It refuses on its
    own moisture, which an item slot could never see.
24. Walk to the campus-farm slurry pit and the Ferrow adit. Both read
    exactly as they did before this build.

---

## Acceptance criteria

Observable from outside the code, by a person playing.

1. A player can look at any lit burner in the game and be told **what it
   is burning**.
2. A player can **add fuel** to a burner, and run the same fire twice.
   The two whiskey drives stop needing their dirty marker for this
   reason.
3. A player firing a loaded retort with no condenser gets the solid
   product and can **smell/measure the difference in the room's air**;
   with a condenser they get a **liquid** as well.
4. A player can turn wood into **tar** and tar into **pitch**, and coal
   into **coke**, **coal tar** and a **gas**.
5. A player taking coke to the smelter gets a sound bloom where coal
   gives a hot-short one, and the furnace's existing complaint about
   fuel stops being reachable with coke in it.
6. A player can hold a gas only in a **sealed** vessel, and is told why
   the other vessels will not do.
7. A player can read a gasometer's level **from across the yard**,
   without a number, and a second player reads the same thing.
8. A player can **light a lamp from gas** and it burns until doused or
   the gas runs out.
9. A player driving a deep heading finds a gas that is **neither** of
   the two that ship, is warned about it by something other than the
   canary, and is hurt if they bring an open flame into it.
10. A player can **drain that gas into a vessel** and carry it out as
    stock.
11. A player kilning malt over peat gets peated malt **because of the
    fire**, and over wood gets unpeated malt, with no recipe differing;
    and a sodden turf is refused with a reason about its wetness.
12. ⚠ **Nothing that reads the air today reads differently**: the
    slurry pit still stinks, the Ferrow adit still breathes, biome rooms
    still report plain air, the canary still dies of the odourless damp
    first, and a smoky room still asphyxiates through the same crisis.
13. ⚠ **No number reaches any of it** — not the gasometer, not the
    working's air, not a fire's smoke, at any competence band.
14. A locality's epoch readout no longer calls an oil-burning town
    *gas-lit*.
15. A conjured fire in a sealed space **smothers**, and leaves **no
    smoke** — so a player can tell a worked fire from a real one by
    looking.

---

## Cross-references

**Seeding slates** —
[fire-combustion-slate](../slates/builds/fire-combustion-slate.md) (the
refuellable burner, the burner that knows its fuel, and the deferred
fire service) ·
[destructive-distillation-slate](../slates/builds/destructive-distillation-slate.md)
(Stage A; Stage B is out) ·
[mining-slate](../slates/builds/mining-slate.md) § the fluid pass (the
hazard half of the gas economy).

**Downstream, and why this build goes first** —
[drilling-slate](../slates/builds/drilling-slate.md): its Decided #6
cedes the commodity half of gas to the retort, and after this build the
**gas well is blocked only on the epoch on-ramp** while the oil well
still waits on the pump and rubber.

**Deliberately deferred to** —
[structures-slate](../slates/builds/structures-slate.md) (the stack,
vertical smoke, the building's bill of materials) ·
[power-utility-slate](../slates/builds/power-utility-slate.md) /
[grid-slate](../slates/builds/grid-slate.md) (the gas main, metered
billing, the civic migration) ·
[rubber-slate](../slates/builds/rubber-slate.md) and
[inquiry-slate](../slates/builds/inquiry-slate.md) (Stage B) ·
[non-visual-senses-slate](../slates/builds/non-visual-senses-slate.md)
(tar's smell) ·
[metal-chain-slate](../slates/builds/metal-chain-slate.md) (coke's
economic arc, and the commons shape firedamp collection touches).

**Subsystem docs that own what this build changes the truth of** —
[fire.md](../subsystems/fire.md) · [bulk.md](../subsystems/bulk.md) ·
[biome.md](../subsystems/biome.md) ·
[respiration.md](../subsystems/respiration.md) ·
[mining.md](../subsystems/mining.md) ·
[metabolism.md](../subsystems/metabolism.md) ·
[light.md](../subsystems/light.md) ·
[instrumentation.md](../subsystems/instrumentation.md) ·
[crafting.md](../subsystems/crafting.md) (where the declared peat hack
is recorded) · [energy.md](../subsystems/energy.md) (the *gas-lit*
rename) · [thermal.md](../subsystems/thermal.md) ·
[uncertainty.md](../uncertainty.md) (the abstraction law the
per-volume decision answers to) ·
[measurement.md](../measurement.md) (the no-gauge reading rules).
