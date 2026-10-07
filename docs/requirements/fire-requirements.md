# Fire — requirements

**Kind:** feature
**Leads from:** kernel — a fire must know what it is burning, how much
air it is getting, and what vessel it is in, before anything downstream
can be a row. ⚠ **First consumers, in this build, all three already
shipped:** `trade-fuel`'s collier (whose draught decision becomes the
dial the whole system turns on, and whose clamp gains a capitalised
sibling), `trade-mining`'s working (a heading accumulates firedamp), and
`trade-smelting`'s furnace (coke, and no more hot-short bloom). A fourth,
`trade-distilling`'s malt kiln, has its peat smoke **stop being
declared** and start being derived.

> ⭐⭐⭐ **The thesis: a fire is its fuel, its air, and its vessel. Heat,
> light and exhaust are all consequences of those three.**

Today a fire is a set of **authored numbers**. How hot it burns, how long
it lasts, how much light it sheds, how much it warms a room, and what
comes off it are all typed onto rows one at a time, and nothing connects
them. Six fire-shaped classes carry per-row dials with no shared
derivation — which is why *"fire is everywhere"* is true in the fiction
and false in the model.

⭐ **And the dial already exists.** The fuel trade ships the one real
judgment anybody makes about a fire: *"Airflow is the decision. Too much
air and the charge burns all the way through and you open a clamp full
of ash; too little and the middle never chars and you draw half-burnt
brands. Between them is charcoal."* That sentence currently governs one
verb in one trade. Under this thesis it governs **every fire in the
game** — because air is what decides whether combustion is complete, and
completeness is what splits a fire's output between heat, light and
exhaust.

Seeded by [fire-combustion-slate](../slates/builds/fire-combustion-slate.md)
(the refuellable burner and the burner that knows its fuel, both filed
2026-10-06 out of the whiskey drives, plus the fire service it defers),
[destructive-distillation-slate](../slates/builds/destructive-distillation-slate.md)
Stage A, and [mining-slate](../slates/builds/mining-slate.md) § the
fluid pass.

⚠ **This is not a trade build.** The collier, the retort, firedamp, the
gasometer and the peat kiln are *expressions* of the substrate, chosen
because each one is a shipped consumer that can exercise it the day it
lands.

---

## What already exists

The survey ran across verbs, packs, subsystem docs, Disciplines and 284
slates, then a second pass over fire itself. Both shrank this build; the
second also found two holes in the first draft of this document.

### The combustion model is real, and better than expected

- **A fire triangle over real material numbers.** Six tabulated
  properties (autoignition point, heat of combustion, melting and
  boiling points and their latent heats), `0`-until-authored so an
  unauthored material never ignites. Ignition is a **derivable energy
  balance** raised by the latent heat of the water the fuel holds — so a
  soaked log resists regardless of size, and that falls out of the
  arithmetic rather than being a rule.
- **Complete vs incomplete combustion already ships.** Enough air gives
  a hot clean burn; starved gives a cooler flame plus **soot and carbon
  monoxide**. ⭐ This is the distinction the whole build hangs on, and it
  is already there.
- **Spread through open boundaries only** — a closed door is a firebreak,
  and a wet neighbour resists because the delivered heat did not cross
  its adjusted ignition point. A fire consuming a building **emerges**
  from the boundary graph with no building concept.
- **Heat reaches a body through one channel**, resolving by the real
  insulation of what you are wearing — so plate conducts a burn and
  padding turns it, the armour inversion emergent from the R-value.
- **Smoke is already an atmosphere** with real density and conductivity,
  turning a scope un-breathable, asphyxiating through the shipped
  respiration crisis, and folding carbon monoxide into the breather's
  **metabolism toxin burden**. An enclosed fire already kills by CO, not
  flame.
- ⭐⭐ **A chamber you load, whose charge decides the product.** The
  `fire`/`burn` verb — *"Fire a loaded chamber and see what the heat
  makes of it."* The controller names no material: it reads what is in
  the chamber and asks which firing row that charge satisfies, with the
  yield ratio authored, so a charge of five yields two and leaves one.
  Its own note: *"a pack that ships a glass batch or a crucible charge
  ships a recipe row and this file never learns the word."* **The retort
  needs no new verb.**
- **A burner family with a load-bearing composition order**, covering
  the forge, the oven, the hearth, the campfire, the smelting furnace,
  the charcoal clamp and the lamp — and a rule learned the hard way:
  *a shared capability chain is not a shared rung.*
- **A hearth heats where you stand; a forge heats what you put in it** —
  two different scopes, deliberately, with a lit forge not warming its
  room.
- **Phase change in both directions** off any heat source, with a molten
  pool landing as bulk matter on the floor.
- **Pyrolysis is already the fuel trade's definition**: *"burn matter in
  starved air, the volatiles leave, the carbon stays — wood in, charcoal
  out (**coal in, coke out, later**)."*

### The rest of the ground

- **The collier** ships whole: the clamp, the draught band with a loss on
  both sides, three outcomes, a `colliery` Discipline anchored at 0722
  (*this world's collier is unambiguously the charcoal-burner*), and a
  burn you can lose entirely.
- **The smelter's coke hook is already in place.** Fuel is found by
  material tag, never by name; coal carries `sulfurous` and routes the
  run to a hot-short bloom whose own row says *"an author who ships a
  way past it (coke) ships a row of their own and this one stops being
  reached."* The furnace's temperature is argued from three physical
  facts, and a hotter fuel is explicitly framed as a **fuel-technology
  rung**.
- **The two damps** — `blackdamp` suffocating and odourless, `stinkdamp`
  reeking — with the canary as the free reading of the one a nose
  cannot catch, an `atmosphere` reading channel, and a gas-analyser.
- **A vessel's closure scale** `open < liquidTight < sealed`, with
  `sealed` already authored for carbonation and its **gas** meaning the
  one part declared and unexercised.
- **Lamp oil end to end**: a material, a cask, an oil works producing it,
  a fuel store burning it a street-night at a time, and a parish
  government buying it through the shipped procurement loop. ⭐ Its
  keywords already include **kerosene**.
- **An enclosure declaration** — name a real material and a thickness;
  the physics comes off the material row and authoring an *effect* is
  lint-refused.
- **The cuts rung**, shipped with whiskey: ordered fractions over the
  volume drawn.
- ⭐ **A retort already stands in the world as scenery** at the Oil Works
  — *"a squat retort standing cold in the corner (the crafted route is a
  later build)"* — and five places in the content tree say that route is
  this build.

### ⛔ What is authored that should be consequent

This is the build.

| what a player experiences | today | should be a consequence of |
|---|---|---|
| how hot a fire burns | a per-row pinned number × a bellows multiplier, consulting neither lit nor fuel | the **vessel's ceiling**, reached only if the fuel can reach it |
| how long a fire lasts | a bare **percentage** — ⚠ so a big log and a twig burn for the same time | the fuel's **mass** and its heat of combustion |
| how fast it burns | a per-row rate | the **air** it is getting, and the fuel |
| how much it warms a room | a per-row wattage | the rate |
| how much light it sheds | per-row lumens | ⭐ **completeness** — soot is what makes a flame luminous |
| what comes off it | **one hardcoded word**, and only if the room's medium was unset | the fuel and the completeness, as **amounts** |
| whether a room runs out of air | an **authored** budget, present on **eight rooms** in the game; absent means unlimited oxygen | the room's **enclosure**, which is already declared |

### What does not exist at all

Verified three ways: no tar, pitch, naphtha, creosote, phenol or coke
anywhere, as material, good or recipe. No firedamp anywhere in code or
content. No gas as a material, no gas phase on any row, no gas as a
good, no gas pressure. No condenser. No gasometer. No safety lamp or any
gated flame. No way to put fuel into a fire. No way to **bank** one. No
flammability limits. ⚠ And no bellows, damper, poker or snuffer as
**objects** — the bellows is a number on a row.

> **Therefore what is genuinely new here is:** that a fire's outputs are
> derived from its fuel, its air and its vessel rather than typed on a
> row; that fuel is matter you can add and air is a consequence of
> enclosure; and that combustion's volatiles become real matter which can
> be caught, stored, burned, sold, or breathed by mistake. Everything
> else named below is a row.

---

## Goals

**The substrate — a fire is a consequence**

- **A fire knows what it is burning**, and a player can be told, in words.
- **Fuel is matter you can add.** No fire in the world is one-shot. A
  heavier charge lasts longer than a lighter one of the same stuff.
- **Air is a consequence of enclosure**, not an authored budget — so a
  closed space genuinely starves a fire and an open one does not.
- ⭐ **The draught decision generalises.** One control, three outcomes:
  open gives a hot clean dim fire that consumes its charge; starved
  gives a cooler sooty bright one that yields volatiles. The band, and
  the loss on both sides of it, is the skill.
- **A fire can be banked** — held at the bottom of its draught — so
  leaving one unattended is a decision rather than a gamble.
- **A fire's heat, light and duration all derive** from those three
  inputs, so the same fire read three ways agrees with itself.

**The exhaust, which is the part with a supply chain**

- **A scope's medium carries amounts of things**, not a single word, so
  *a little* and *a lot* differ and a mixture is expressible.
- ⭐ **Gas is measured per volume, never as a fill fraction** — so
  pressure is a derivable consequence rather than a later addition. This
  is the one constraint the drilling vertical imposes and it is
  load-bearing: a gas well is driven by pressure, and its only depletion
  signal is pressure falling.
- **Volatiles are real matter** and go where there is something to
  receive them: a vessel catches them, a closed room fills with them, an
  open one loses them.
- **They are worth something**: wood tar boiling to pitch, coke that does
  not ruin iron, and coal gas a lamp will burn and only a sealed vessel
  will hold.
- **A gas is storable and therefore sellable**, with a gasometer whose
  level anyone can read without a number.

**The expressions**

- **A working accumulates firedamp**, which suffocates like the damps
  that ship and, unlike them, **catches fire** — so the lamp in your hand
  is the hazard, and ⭐ **a safety lamp is the remedy**, because a hazard
  with no counter is a wall.
- **The arc completes**: a gas that kills you → a gas you vent → a gas
  you collect. Draining ahead of the face is the mine's own act.
- **The peat smoke in a malt kiln derives** from the fire instead of being
  declared by a recipe, and a sodden turf refuses on its own moisture
  instead of being silently accepted.

## Non-goals

- ⛔ **The fire service** — the brigade ladder, fire code and inspection,
  insurance and its moral hazard, arson and investigation. → already
  designed in
  [fire-combustion-slate](../slates/builds/fire-combustion-slate.md).
  ⭐ This build is its precondition rather than a down payment: a fire
  with a real **rate** is a fire that can be knocked back, and `douse`
  being binary is why suppression cannot exist today.
- ⛔ **Map-scale wildfire, and the standing fuel-load / dryness of a
  place** — the field that would make a forest in August differ from one
  in March. → the same slate, with the brigade. It needs a place-scale
  reservoir, which is its own mechanism, and it produces nothing until
  somebody fights fires.
- ⛔ **The flue, the stack, chimney sweeping, and smoke moving between
  rooms.** → the [structures-slate](../slates/builds/structures-slate.md),
  whose own justification test names *"a chimney or a flue serving more
  than one hearth"* and *"vertical heat, smoke and sound"* as leading
  candidates. A stack serving two hearths needs an owner above the room.
  ⭐ The sweep is a real vocation and it is **downstream of the stack**,
  so it waits with it.
- ⛔ **The full fire-tool catalogue** — tongs, poker, fire screen,
  trivet, tinderbox, flint and steel. → the same slate, as a tools pass.
  ⚠ In scope only where the derivation **requires** it: a way to set a
  vessel's draught, and the safety lamp. The bellows keeps the surface
  it already has.
- ⛔ **Mine flooding, bailing and the pump.** → the
  [mining-slate](../slates/builds/mining-slate.md)'s
  below-the-water-table stage, with the economics in
  [metal-chain-slate](../slates/builds/metal-chain-slate.md) and the seal
  in [rubber-slate](../slates/builds/rubber-slate.md). Water in a working
  produces nothing and shares only the word *fluid* with this build's
  subject. ⭐ The liquid this build exercises is the condensate.
- ⛔ **The first plastic / the thermoset.** → the destructive-distillation
  slate's Stage B, gated on the epoch on-ramp
  ([inquiry-slate](../slates/builds/inquiry-slate.md)). It is the one
  rung that is knowledge-by-law rather than knowledge-by-tradition.
- ⛔ **Aniline dyes and the dyer's disruption.** → `trade-dyeing`'s own
  follow-on. The seam is already authored in madder's row: *"where it
  came from — a bed, a field, **or one day a retort** — is upstream and
  none of dyeing's business."*
- ⛔ **A piped gas main, metered gas billing, and migrating a town's
  street lighting from oil to gas.** → the
  [power-utility-slate](../slates/builds/power-utility-slate.md) and
  [grid-slate](../slates/builds/grid-slate.md), where *"gas as a second
  piped commodity"* is already a deferred seam. This build sells gas in
  a vessel, not through a pipe.
- ⛔ **Light quality and colour** — that candlelight is warm and gaslight
  is harsh, and what that does to a room or a portrait. → a light build;
  ⚠ named here because *brightness* derives in this build and *quality*
  deliberately does not, which is an asymmetry a later pass should
  close.
- ⛔ **The magic Fire school.** → [magic.md](../subsystems/magic.md) and
  the capability-magic slate. This build decides how a worked fire
  **behaves** (below) so the school inherits an answer instead of
  inventing one.
- ⛔ **Generalising building condition, and any second condition clock
  for fire damage.** → `holding.md` states that conversation needs its
  second consumer in the room and says not to have it alone. Fire
  damage, when it lands, reuses shipped condition: *fire produces repair
  bills, not craters.*
- ⛔ **Pyroligneous acid, methanol and acetone.** Nowhere, deliberately —
  the demand test refuses them, they have no consumer, and tar alone
  carries the rung.
- ⛔ **Tar having a smell.** → the
  [non-visual-senses-slate](../slates/builds/non-visual-senses-slate.md).
  The aroma vocabulary is closed at eleven words, `tar` is not among
  them, and the gate that makes adding a twelfth expensive shipped three
  days ago.
- ⛔ **A new Discipline.** `colliery` already *is* this craft, and the
  fuel trade's own definition already covers *coal in, coke out*.
  Nowhere, deliberately.

---

## Placement

**Kernel**, for the substrate. That a fire derives its outputs from fuel,
air and vessel is a fact about how the world works, composed by classes
that already live in the kernel — the forge, the oven, the hearth, the
lamp, the campfire, the clamp — and read by three packs that cannot
depend on one another.

**The content is each trade's own**, under the root it already holds:

| content | pack |
|---|---|
| the retort and condenser, wood tar, pitch, coke, coal gas, the gasometer | `trade-fuel` — the retort is the clamp's **capitalised sibling**, not a new trade |
| firedamp in a working, draining it, the safety lamp | `trade-mining` |
| coke as a charge that does not ruin iron | `trade-smelting` (a row; its refusal path already waits for it) |
| the peat kiln's derived smoke | `trade-distilling` — a row change, and a hack removed |
| the worked flame (a conjured fire that makes no exhaust) | `arcane-library` — a spell row, a locus thing row and a 20-line class on the shipped `GlowlightMote` pattern. ⭐ It is what EXERCISES the kernel's worked-fire answer; without it that answer ships unreachable |

⭐ **The second-instance test passes:** a second retort, a second
gasometer, a second gassy mine is a row. A second **gasworks** — a town
with its own institutions around gas — would be `/system/fire`'s, and
that pack does not exist and is not justified yet. The test for when:
the moment a realm wants its own brigade or gas undertaking with
different institutions. Fire's **physics stays kernel** for the same
reason water's precipitation integral did — the system pack holds
networks and institutions, not the laws.

⚠ **No new namespace root, and no new Mongo collection.**

---

## Collisions

- ⚠⚠ **Every fire in the game.** The derivation replaces authored dials
  on the forge, oven, hearth, campfire, smelting furnace, clamp, lamp,
  lantern, torch, brazier, stove and still. Existing content is
  placeholder and may visibly change; what must **not** change is
  whether a shipped flow still completes — the smelter must still smelt,
  the oven still bake, the still still run.
- **The Terminus Oil Works** has a cold retort in its floor description
  and spawns lamp-oil casks as floor stock. Making that retort real
  means its prose and its stock story stop saying *later*. ⭐ The works,
  its outfit and its hand exist — this build gives them something to do
  rather than adding a venue.
- **The collier's fuel yard** gains the retort and loses nothing: clamp
  and retort coexist by decision.
- **Heart's Delight** is the oil-lit town whose parish government buys
  fuel. ⚠ Its lighting must keep working; migrating it to real gas is
  out of scope.
- **The Hearthworks' sealed cellar** is the shipped lesson about
  enclosure and bad air, and one of the eight rooms with an authored air
  budget. Under a derived budget it should still teach exactly what it
  teaches now — check it, do not rewrite it.
- ⚠ **The campus-farm slurry pit** is the one authored `stinkdamp` row,
  and biome rooms author plain `air` deliberately (*"foul air is NOT a
  biome fact"*). Both must keep resolving identically.
- ⚠ **The canary** reads the air at Ferrow and must not be made
  dishonest. It is the free reading of the **odourless** damp; firedamp
  needs its own tell so the bird does not become the only instrument.
- **The malt kiln** is where the peat hack lives. The whiskey drives are
  the regression surface, and ⭐ **both are marked dirty specifically
  because no burner can be refuelled** — this build should let them run
  twice, which is a visible outcome it can claim.
- ⚠ **Unlit interiors are pitch black**, and the tell is every object
  reading as *something*. Derived brightness changes how much light a
  given fire sheds, so any room lit only by a fire is a place this build
  can accidentally darken.

---

## Surface decisions

### The vessel sets the ceiling; the fuel decides whether you reach it

A forge is hotter than a campfire because of **how it is built** —
enclosure, draught, bellows — not because of what is in it. So the
vessel keeps an authored ceiling temperature, and the fuel decides
whether that ceiling is reachable, how fast, and for how long. ⭐ This
makes a sentence the smelter already says true instead of scripted:
*"The draught is not the problem — this fuel does not burn hot enough."*

### Air is derived from enclosure, not authored per room

An authored budget present on eight rooms is not a sparse optimisation,
it is the system being off: everywhere else, combustion has unlimited
oxygen. Enclosure is **already declared** (a material and a thickness,
with a two-rung fallback) and is already what the thermal model reads,
so the air a space holds and how fast it replenishes are consequences of
it. ⚠ This makes every interior in the game capable of starving a fire,
which is the correct behaviour and a wide change.

### One draught control, three outcomes

Open: hot, clean, **dim**, and the charge is consumed. Starved: cooler,
sooty, **bright**, and the volatiles survive to be caught. ⭐ The same
dial the collier already turns, now with the loss on both sides meaning
something for every fire — and with *different optima for different
goals*, which is what keeps it judgment rather than a remembered number.

### Brightness derives from completeness, because soot is what glows

A clean flame is dim and a sooty one is luminous — it is why a blowtorch
is nearly invisible, why a candle is yellow, and why coal-gas lighting
was poor until the mantle. ⭐ Deriving it means **coal gas gives bad
light until somebody solves it**, which makes the light ladder an
achievement instead of an assertion. ⚠ It also means a well-run fire is
*dimmer*, which the prose must say out loud or it reads as a defect.

### Duration derives from mass; rate derives from air

A bare percentage makes a log and a twig burn for the same time. Mass
and heat of combustion give the energy, air and the vessel give the
rate, and the two together give the duration. **Banking** is the bottom
of that rate — not a new mechanism, the draught dial at its low end —
which is what makes *"the player who banked the fire before logging off
is safe"* a mechanism rather than an intention.

### Uncaptured volatiles go into the air of the room

Not up an abstract chimney and not nowhere. With a condenser they are
caught; without one they enter the scope's medium, which is already
un-breathable and already asphyxiates. ⭐ So *"run a retort in a closed
space and you poison yourself"* is emergent — and it only actually works
because air is now derived. A chimney, later and owned by a building,
becomes purely additive: an object that vents a room's medium outside.

### Gas is measured per volume, and pressure derives

*How much of a substance per unit of medium*, never *how full is the
vessel*. A fill fraction cannot honestly answer *"how much is in there"*
for a compressible fluid, and it would leave a gas well with no driver
and no depletion signal — so drilling would need a second gas model,
which is precisely the *two parallel gas economies* both slates warn
against. ⭐ Measured intensively, total pressure is a consequence of the
mixture and the gasometer's rising bell is an honest readout of it.

### The medium's identity and its contents are two different facts

What the medium **is** stays what it is today — a named thing, authored
on rows that ship. What it **carries** is new and sits beside it. Same
rule the whiskey build settled for liquids: *what a thing is is a
material; how much of something it carries is a concentration.* ⚠ It
also means the two damps can later be re-expressed as *air carrying
something* without breaking the row that authored the word.

### Firedamp suffocates, catches fire, and has a remedy

A gas that only suffocated would duplicate blackdamp. The explosive damp
is the point, and it is the one that is also a fuel — so it ignites on
contact with an open flame above a concentration. One threshold, not a
full flammability-limits model. ⭐ That makes **the lamp in your hand the
hazard**, which is the real history, and it is why the **safety lamp**
is in scope: a gated flame you can carry into a gassy working. ⚠
Firedamp's warning must not be the canary — that bird is the odourless
damp's reading, and giving it a second job makes it a spare.

### Coke's row ships here; coke's economics stay with the metal chain

Two slates claim coke and they claim different things. The **row** — a
fuel that does not ruin iron — is a retort product and belongs with the
retort, where the smelter's refusal path is already waiting. The **arc**
— the industrialised mine that burns coal it digs itself and stops
needing the forest — stays the metal chain's.

### The retort coexists with the clamp

The clamp stays the poor collier's kit; the retort is built, costs
capital, and pays back only if somebody wants the byproducts. ⭐ A retort
that strictly dominated would delete a shipped decision and make the
trade's existing judgment worthless.

### The gasometer is the works' object, not the town's

Built, owned and read by whoever makes gas. ⭐ Its level is visible and
carries no number — a public, honest readout of a shared stock anybody
can look at. Who **governs** a town's gas supply is the utility slate's.

### ⚠ "Gas-lit" currently means oil-lit, and must stop

A locality's derived epoch reads *gas-lit if it burns oil*. Once real
gas exists that readout is a lie, so the word moves to the thing it
names and the oil epoch gets its own honest one. A rename, not a
mechanism, in scope because this build is what makes it false.

### A worked fire obeys the air and makes no exhaust

A conjured fire injects heat into the same physics — it gets no damage
path of its own. Two consequences, both kept: a fire in a sealed space
**consumes the air and smothers**, conjured or not, because conservation
holds globally; and a fire with **no fuel makes no exhaust**, so ⭐
**smoke is the tell that distinguishes a real fire from a worked one**,
and ⭐⭐ a worked fire is **dim**, because there is no soot in it. Nobody
authors any of that.

### Forward compatibility with Structures, stated as a constraint

Structures will be justified — a shared roof, a stack, the building as a
unit of repair and condemnation, and somewhere to say what a building is
made of, which is what paying for buildings in real materials needs.
⚠ *Per-room enclosure already answers the physics correctly and will keep
doing so; what is homeless is the building's **bill of materials**, and
that is not this build's.* So this build leaves the door open:

1. the medium's contents resolve through the **same outward walk** the
   medium already uses, so a building tier can later sit between a room
   and its zone;
2. nothing transports a medium **between** scopes;
3. a flue or chimney, if one ever appears, is an **object** — because
   re-parenting an object is a move and migrating a room's field is a
   migration, and this project does not do migrations;
4. building condition is untouched, and no second condition clock is
   introduced.

⭐ The dividend: every fire question deferred here lands on Structures'
justification pile as **evidence** rather than being guessed at now.

---

## Lens pass

⚠ Run against **fire**, not against the scope. The first attempt lensed
the chosen build and could therefore only validate it; this pass found
the missing safety lamp, the eight-room air budget, and the luminosity
argument that put derived brightness in scope.

**1 · Pedagogy.** Disciplines exercised: `colliery` **dominant**, with
`mining` and `smelting` secondary; no new one, and that is the honest
answer rather than a gap. ⭐⭐ What becomes derivable is the fire triangle
as a *controllable* system, and specifically that **its three products
trade off against each other**: air buys heat at the cost of light and
volatiles. A player who internalises *soot is what glows* can predict
that a clean blue flame sheds no light, that a gas lamp needs something
doing to it, and that the sooty end of the dial is where tar comes from —
and be right, without looking anything up. ⚠ The dominant-Discipline
trap is the thing to watch, and the draught survives it: it is a
continuous band with a loss on both sides **whose optimum differs by
what you are trying to make**, so it cannot collapse into a remembered
number. Also derivable, and already shipped: why coke had to be invented
at all. **Altitude: invariant** for the physics, **grain** for the claim
that the draught is the dial players should be touching.

**2 · Expression.** ⭐ The ordinary case costs nothing: a material that
burns authors an ignition point and a heat of combustion, which is
already the pattern, and says nothing about light or smoke. The bespoke
case is a row — a new fuel, a new firing, a new gas. ⭐⭐ And fire is
where *personalization as a derivative of supply-chain depth* pays
best, because **everything downstream needs a fire**: once what comes
off a fire is a row, peated-versus-unpeated generalises to smoked foods,
fired glazes, charred barrels and tar-dressed rope, with no kernel
change per case. ⚠ The thing to protect: a pack must never need a kernel
list edit to add a gas or a fuel.

**3a · Immersion.** The fiction betrays itself today in four places this
build closes: a clamp whose prose says the volatiles leave while nothing
receives them; a retort standing in a room nobody can use; a log and a
twig burning for the same time; and an enclosed fire that only suffocates
you in the eight rooms somebody remembered. ⚠ Two new risks the
derivation introduces, both of which the prose must carry rather than
the numbers: a well-run fire gets **dimmer**, which reads as a bug
unless the description says *the flame burns clean and sheds little
light*; and a room filling with exhaust must **warn before it kills** —
the shipped respiration bands give a free continuous warning and nothing
here may bypass them. ⭐ And no digit reaches any reading, at any
competence band.

**3b · Participation.** The role this opens is the one the world already
advertises and cannot staff: somebody who runs a retort — and the Oil
Works has an outfit, a hand and floor stock waiting. ⚠ By the five
criteria it is an **upper rung of an existing trade**, not a new
vocation, which is correct: the collier is the ladder and the retort is
its capitalised rung. ⭐ Can the polity do something we did not want?
Twice over, and cheaply. A gasometer's level is **public**, so a town
can see another party's stock and hoard, undercut or refuse to supply
with nothing authored. And ⭐⭐ once air derives from enclosure,
**enclosure becomes a weapon**: brick up a space, light a fire, and the
air goes. That is emergent participation of exactly the kind this lens
measures, and it is named here as a consequence we accept rather than
one we discover. ⚠ Recorded as a gap: **fire prevention and suppression
are the largest civic hole in the game** and stay open after this build.

**4 · Values.** Three undecidables, at different altitudes. ⭐ **What a
town does about a visible stock one party owns** — the gasometer converts
*are we running out* from a rumour into a shared observation, which is
the gauge move, and then deliberately stops: the engine makes depletion
**legible**, and whether anything should stop it is the polity's.
*Altitude: grain* — a world may have a private, unreadable works, and
the substrate is *for* the visible one. ⭐⭐ **Whether a dangerous trade
may be practised where people live** — a retort indoors poisons a room,
and derived air makes that true rather than rhetorical; whether that is
the operator's business alone or the street's has no derivable answer and
must be decided. *Tier C, the polity's.* And **whether banking your fire
is a duty** — the medieval curfew was literally *couvre-feu*, a
fire-prevention ordinance, which makes it the best available example of
a mundane law with an honest reason. *Tier C.*

**5 · Continuity.** ⭐ The strongest lens here, and the source of the
per-volume constraint. The three inputs are the same in every epoch: a
campfire, a charcoal clamp, a coal retort, a gas retort, a crude column,
a blast furnace. The test — *does the new epoch's object answer the same
commands* — passes, because `fire`, `stoke`, `bank` and the draught are
all about fuel and air, which never change; what changes is the ceiling
and the feedstock. ⭐⭐ Hence **wood in a retort, coal in a retort and
crude in a column are one mechanism with three charges**, which is why
refining needs no new machinery and why this build pre-builds the gas
half of drilling. On the reading side, the same measured quantity is
banded by a nose medievally and numbered by an analyser industrially —
the shipped instrument ceiling, untouched. ⛔ **The failure to refuse by
name is a fill fraction**, which models at the level of the vessel
instead of the physics and would have to be rewritten rather than
re-parameterised for a well. And magic sits on the same axis rather than
beside it: a worked fire is heat into the same physics, so it needs no
fuel, makes no exhaust, is dim, and still consumes the air.

**6 · Economy.** Produces: tar, pitch, coke, coal gas, and a reason for
the oil works to exist. Consumes: wood, coal, peat, and the capital to
build a retort instead of a clamp. Who pays: the smelter pays for coke
because it ruins less iron, a lamp-owner pays for gas, and ⭐ **the
demand was there first and is already paying somebody** — street
lighting runs now, a parish treasury buys fuel through a shipped
procurement loop, and the smelter's hot-short refusal is a standing
complaint with no remedy. ⭐⭐ The build also closes a **named** hole
rather than opening one — *"nothing refuels a furnace; a furnace is a
consumer with no supplier"* — and because fire is the economy's deepest
input, making fuel real gives the smelter, kiln, still, oven, lamp and
hearth a supply chain each. ⚠ It is also the first time a new technology
**undercuts a shipped player vocation** (wood tar against the tapper's
pitch); that is already reconciled as an **epoch pair rather than a
conflict** — same product, two technologies, different feedstocks — and
the pacing is a polity matter, not a dial.

**7 · Governance.** ⭐ It does not bite in this build, and keeping it
that way is the decision: nothing here judges a person. The gasometer
measures a stock, not an owner; a retort indoors is a hazard, not an
offence. ⚠ But the build **manufactures the preconditions** and that
should be said plainly — once enclosure plus fire is something you can
inflict on a neighbour, fire becomes *the emission model's catastrophic
case*, which is a governance question needing a criterion, an appeal and
an entrenchment tier, and it belongs to the fire-service build.
⚠ Recorded as a gap: collecting firedamp touches the drainage commons'
free-rider shape — venting helps your neighbour, collecting does not —
and that argument is the metal chain's. This build must not pre-empt it.

---

## The drive

What a person does, in order, in the live game. Run at the end of the
build phase, before the MR opens.

**Part 1 — a fire is its fuel**

1. Find a lit burner that has been running — the still at Crowsfoot, or
   a forge. `look` at it. It says **what it is burning**, in words.
2. `stoke` it with the wrong thing (a stone; a soaking log). It refuses,
   in its own words, naming the reason.
3. `stoke` it with cordwood. The refusal lifts and the fire keeps going.
4. Let it burn out. Stoke it cold, `ignite` it again. ⭐ It runs a second
   time — which no fire in the game can do today.
5. Build two small fires, one charged with a heavy log and one with
   kindling of the same wood. ⭐ The heavy one is still going when the
   light one is embers.

**Part 2 — a fire is its air**

6. On an open fire, set the draught wide. It is hot and burns clean —
   and ⭐ **sheds less light than you expect**, and the description says
   so.
7. Starve the draught. It cools, goes sooty and **bright**, and the room
   starts to take smoke.
8. `bank` it and walk away. Come back later: ⭐ still in, barely
   consumed.
9. Light a fire in a **sealed** interior and stay with it. The air
   warns you in bands before anything lethal happens; the fire
   eventually **smothers itself**. ⭐ Do the same outdoors and neither
   happens.

**Part 3 — the clamp, then the retort**

10. At the fuel yard, run a charcoal burn in the clamp as the collier
    does today. Charcoal, as before — **and nothing else**, with the
    smoke still going out of the vents.
11. Load the **retort** with the same cordwood and fire it with **no
    condenser**. Char comes out; the room's air has gone bad. `measure`
    the atmosphere — it reports what is in it, in words, no number.
12. Leave; the air clears. Attach the condenser and fire it again: char
    **and** a liquid in the receiving vessel. `look` at it — wood tar.
13. Boil the tar down. It becomes **pitch**.

**Part 4 — coal, and the three products**

14. Charge the retort with **coal**. Fire it. You get **coke**, **coal
    tar** and a **gas**.
15. Try to hold the gas in an open vessel, then a liquid-tight one. Both
    refuse or lose it, in words that say why. A **sealed** one holds it.
16. Take the coke to the smelter and run a charge. ⭐ It smelts, and the
    hot-short bloom is **not** what you get.

**Part 5 — the gasometer and the lamp**

17. Put the gas into the **gasometer**. Its bell rises; read it from
    across the yard — a level, in words, no number anywhere, and a
    second player reads the same thing.
18. Fill a lamp from it and `ignite`. It burns gas — ⭐ and it is
    **dim**, because the flame is clean. That is the mantle problem,
    arriving by itself.
19. Draw the gasometer down and read it again. The level falls.

**Part 6 — the mine**

20. Go to Ferrow, drive a heading in, and work it until it is deep.
21. `measure` the atmosphere as you go. ⭐ A gas is accumulating, and it
    is **not** either of the two that ship.
22. Check the canary. It should **not** be what tells you — this damp
    has its own tell.
23. Carry an **open flame** into the gassy heading. ⛔ It ignites, you
    are hurt, and you had a way to know.
24. ⭐ Take the **safety lamp** in instead. You can work, and the flame
    does not reach the gas.
25. Hole the heading through to air; the gas clears, as the shipped
    atmosphere derive already does for blackdamp. Then instead **drain**
    it ahead of the face into a sealed vessel — ⭐ the thing that was
    trying to kill you is stock you can carry to the gasometer.

**Part 7 — the regressions that matter**

26. Run the whiskey drive's peated malt: kiln barley over **peat**. ⭐
    The smoke in the barley comes from the **fire** now, not from a
    declared recipe field — and kilning the same recipe over plain wood
    gives unpeated malt.
27. Try to kiln over a **sodden, freshly-cut turf**. ⭐ It refuses on its
    own moisture, which an item slot could never see.
28. Walk the shipped flows end to end: the smelter smelts, the oven
    bakes, the still runs, the Hearthworks cellar still teaches what it
    teaches, the slurry pit still stinks, the Ferrow adit still breathes,
    and no room lit by a fire has gone dark.

---

## Acceptance criteria

Observable from outside the code, by a person playing.

1. A player can look at any lit burner and be told **what it is
   burning**.
2. A player can **add fuel** to a burner, cold or lit, and run the same
   fire twice. The two whiskey drives stop needing their dirty marker
   for this reason.
3. A heavier charge of the same fuel **lasts longer** than a lighter one.
4. Opening the draught makes a fire hotter, cleaner and **dimmer**;
   starving it makes it cooler, sootier and **brighter**, and the words
   say so both times.
5. A player can **bank** a fire, leave, and come back to it still in.
6. A fire in a sealed interior **starves**, having warned the player in
   bands first; the same fire outdoors does not.
7. A player firing a loaded retort with no condenser can **smell and
   measure the change in the room's air**; with a condenser they get a
   **liquid** as well.
8. A player can turn wood into **tar** and tar into **pitch**, and coal
   into **coke**, **coal tar** and a **gas**.
9. Coke gives the smelter a sound bloom where coal gives a hot-short one.
10. A gas can be held **only** in a sealed vessel, and the other vessels
    say why not.
11. A gasometer's level can be read **from across the yard** without a
    number, and two players read the same thing.
12. A lamp can be **lit from gas**, burns until doused or empty, and is
    noticeably **dim**.
13. A player driving a deep heading finds a gas that is **neither** of
    the two that ship, is warned by something other than the canary, and
    is hurt if they bring an open flame in.
14. ⭐ A **safety lamp** lets that player work the gassy heading, and a
    player who has one is not refused where a player with a naked flame
    is.
15. That gas can be **drained into a vessel** and carried out as stock.
16. Malt kilned over peat is peated **because of the fire**, the same
    recipe over wood gives unpeated, and a sodden turf is refused with a
    reason about its wetness.
17. A conjured fire in a sealed space **smothers**, leaves **no smoke**,
    and is **dim** — so a player can tell a worked fire from a real one
    by looking.
18. ⚠ **Every shipped flow still completes**: the smelter smelts, the
    oven bakes, the still runs, the clamp chars.
19. ⚠ **Nothing that reads the air reads differently than it should**:
    the slurry pit stinks, the adit breathes, biome rooms report plain
    air, the canary still dies of the odourless damp first, and a smoky
    room still asphyxiates through the same crisis.
20. ⚠ **No room lit only by a fire has gone dark**, and ⚠ **no number
    reaches any reading** — not the gasometer, not a working's air, not
    a fire's smoke — at any competence band.
21. A locality's epoch readout no longer calls an oil-burning town
    *gas-lit*.

---

## Cross-references

**Seeding slates** —
[fire-combustion-slate](../slates/builds/fire-combustion-slate.md) (the
refuellable burner, the burner that knows its fuel, and the deferred
fire service) ·
[destructive-distillation-slate](../slates/builds/destructive-distillation-slate.md)
(Stage A; Stage B is out) ·
[mining-slate](../slates/builds/mining-slate.md) § the fluid pass.

**Downstream, and why this build goes first** —
[drilling-slate](../slates/builds/drilling-slate.md): its Decided #6
cedes the commodity half of gas to the retort, and after this build the
**gas well is blocked only on the epoch on-ramp** while the oil well
still waits on the pump and rubber.

**Deliberately deferred to** —
[fire-combustion-slate](../slates/builds/fire-combustion-slate.md) (the
brigade, fire code, insurance, arson, wildfire, the standing fuel-load
field, the fire-tool catalogue) ·
[structures-slate](../slates/builds/structures-slate.md) (the stack,
vertical smoke, the sweep, the building's bill of materials) ·
[power-utility-slate](../slates/builds/power-utility-slate.md) /
[grid-slate](../slates/builds/grid-slate.md) (the gas main, metered
billing, the civic migration) ·
[rubber-slate](../slates/builds/rubber-slate.md) and
[inquiry-slate](../slates/builds/inquiry-slate.md) (Stage B) ·
[non-visual-senses-slate](../slates/builds/non-visual-senses-slate.md)
(tar's smell) ·
[metal-chain-slate](../slates/builds/metal-chain-slate.md) (coke's
economic arc, and the commons shape firedamp collection touches) ·
[capability-magic-slate](../slates/builds/capability-magic-slate.md)
(the Fire school, which inherits this build's answer).

**Subsystem docs that own what this build changes the truth of** —
[fire.md](../subsystems/fire.md) · [bulk.md](../subsystems/bulk.md) ·
[biome.md](../subsystems/biome.md) ·
[respiration.md](../subsystems/respiration.md) ·
[light.md](../subsystems/light.md) ·
[thermal.md](../subsystems/thermal.md) ·
[mining.md](../subsystems/mining.md) ·
[metabolism.md](../subsystems/metabolism.md) ·
[instrumentation.md](../subsystems/instrumentation.md) ·
[crafting.md](../subsystems/crafting.md) (where the declared peat hack is
recorded) · [energy.md](../subsystems/energy.md) (the *gas-lit* rename) ·
[advancement.md](../subsystems/advancement.md) (why no new Discipline) ·
[uncertainty.md](../uncertainty.md) (the abstraction law the per-volume
decision answers to) · [measurement.md](../measurement.md) (the no-gauge
reading rules) · [design-lenses.md](../design-lenses.md).
