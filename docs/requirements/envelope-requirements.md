# The envelope — requirements

**Kind:** feature
**Leads from:** kernel — **first consumer: Terminus.** Its streets, the
terminal hall, the general store, the cookhouse and the Hearthworks are
where this is driven, and every one of the realm's 173 authored
locations is touched by the content pass.

Two questions, one answer. *Why can you see on the city streets at
midnight?* and *why don't you freeze in the lounge?* are the same
question, and today they have the same bad answer: **a number somebody
typed.** A room's light is an authored constant, and an indoor room's
temperature is an authored constant. Neither has a source. Outside,
temperature is already alive — the weather deviates it and the season
biases it — so the realm already has a winter, and stepping through a
door puts you in 21 °C by decree with the door open and no fire lit.

This build makes the room what it physically is: **an envelope that
holds a state different from outside, at a cost.** Light and heat are
two things that cross it — a window admits both, an open door loses
both, a cellar has neither — and both of them now come from somewhere a
player can point at: the sky, the moon, a lamp somebody filled, a fire
somebody fed.

It deliberately stops at the door of the energy *industry*. Nothing here
is piped, metered or billed. What it builds is the **demand** — the
reason an energy trade will have customers when it ships.

Seeded by: [power-utility-slate](../slates/builds/power-utility-slate.md),
[grid-slate](../slates/builds/grid-slate.md),
[fridge-design-pack](../slates/builds/fridge-design-pack.md) (which names
"the appliance/energy build"), and the day/night conversation that
followed the trades-and-labor build.

---

## What already exists

The product-level survey. Most of this build is **joining things that
were each built and left unconnected**, which is why it is smaller than
it sounds.

**The sky is fully modelled and almost entirely unused.** The world
knows where the sun is, where the moon is, what phase the moon is in,
when the sun rises and sets, and what season it is — all from real
orbital geometry, with polar day and polar night as honest limits. Three
*instruments* read it (`analyze sky`, `measure altitude`, `measure
shadow`) and the breeding season reads daylength. **Nothing else in the
world asks what time of day it is.** The time doc records why: the
wiring into ambient light was deferred in writing until "the perception
branch merges." It merged. Nobody came back.

**Outdoor weather is alive.** Temperature, humidity, wind and pressure
deviate procedurally, season-biased, and fold into what an outdoor room
reads. Cloud already **dims** an outdoor room's light through a
multiplicative factor that the perception read consults synchronously —
so the mechanism for "the sky is darker today" is built, proven and in
use. The sun is simply not one of its terms.

**Indoors is a decree.** The shared indoor baseline authors 21 °C. Every
interior in the realm inherits it — in January, at 4 a.m., with the door
open.

**Nothing heats a room.** This is deliberate and half-right: a lit forge
must not warm the room it stands in, because *inside the fire* is not
*near the fire*. But the consequence is that **no heat source of any
kind changes a room's temperature**, and the mechanism that would change
it has no caller anywhere in the tree.

**Fire works.** Things burn, fuel is a real reserve that drains over
game-time, a fuelled appliance holds a genuine fuel-and-air-driven
temperature while lit and cools when it burns out, and heat spreads
between rooms through open boundaries only — a closed door is a
firebreak.

**The verbs are already there.** `ignite` / `light` / `kindle`, `douse`,
`switch on` / `off`, `feel`, `look`. ⭐ **This build needs no new verb**,
which closes the reachability link that has cost this project the most.

**Bodies already feel cold and already pay for it.** The body has a real
thermal model, clothing insulates with a derived warmth value computed
from what is actually worn and where, and cold cascades into conditions.
⚠ And there is a standing finding (recorded 2026-09-21) that the cold
branch is badly tuned — burning roughly a quarter of a body's reserve an
hour on an unclothed body **at 21 °C**, with dials about ten times too
harsh. If that still holds, a world with cold rooms in it kills the cast.

**Species already have night vision** — a per-species band shift that
makes everything read one band brighter or dimmer. Nothing has ever
exercised it, because nowhere is dark.

**Floors are real now.** The ground build (MR !283) made a floor a
universal thing with a material and a five-rung underfoot ladder, and
left *coverings* — a rug, snow over paving — as a named open seam.

**The fuel trade is charcoal and nothing else**: one pit, one verb, one
Discipline, and ash. Coal and peat are the **next build on the ground
track** — extraction's requirements and plan are already written, and
its Left names *"coal as a hearth fuel"* and *"peat, cut wet and dried."*

> **Therefore what is genuinely new here is the envelope itself** — the
> room as a thing with an inside and an outside, a leak between them,
> and a named source for each of the two states it holds. Every
> ingredient exists. Nothing joins them, and no room in the realm can
> answer *where is this light coming from* or *what is keeping this
> place warm*.

---

## Goals

- **Night is real, and survivable.** Outdoor light follows the sun, the
  moon's phase and altitude, and the cloud. A moonlit night is enough to
  move by; a moonless or heavily overcast one is not.
- **Every room's light has a source a player can point at** — the sky
  through an opening, or something lit in the room. A room with neither
  is dark, and that is correct rather than a bug.
- **A town lights its streets, and it costs the town something.** Public
  lamps are public property, they burn fuel, somebody is answerable for
  them, and when nobody is, the street goes dark.
- **A room's warmth has a source, and the room loses it.** Indoor
  temperature is derived from outside, what is burning inside, and how
  well the room is shut — never declared.
- **Fire is answerable for what it consumes.** A lit lamp and a lit
  hearth burn fuel and eventually go out.
- **Cold is a cost, not a death sentence.** The body's cold response is
  retuned against a world that can now actually get cold, so that
  ordinary life is survivable and cold buys you a decision rather than a
  corpse.
- **The realm is authored with sources** — the content pass that gives
  every shipped room its light and its warmth, and gives the businesses
  hours that mean something.
- **A day that differs from a night is visible in ordinary play** —
  without typing a single new verb, and without reading a number.

---

## Non-goals

Each names where it goes.

- **Piped, metered or billed supply of anything** → the energy/utility
  build, over [power-utility](../slates/builds/power-utility-slate.md) +
  [grid](../slates/builds/grid-slate.md) +
  [delivery](../slates/builds/delivery-slate.md). ⚠ That build also owes
  a reconciliation: **two utility shapes already shipped** (water as a
  conduit, the aether line as mana) and a third commodity must join them
  rather than add a fourth.
- **Fuel as an industry** — a fuel market, prices, a coal merchant, the
  lamplighter as a trade → the same energy build. Here fuel is something
  you *have and burn*, bought at the shop that already sells things.
- **Coal and peat as materials** → [extraction](../slates/builds/extraction-slate.md),
  already planned on the ground track. This build must consume them
  **as rows** when they land, never as a hardcoded list.
- **Refrigeration and appliances** → [fridge pack](../slates/builds/fridge-design-pack.md).
- **Arson, wildfire, the fire brigade, fire as a weapon** → already
  deferred on [fire.md](../subsystems/fire.md); untouched.
- **The shift market** — shifts as the unit of commitment, substitution,
  turnover, crew arbitration → the labor build, which this one is
  deliberately sequenced ahead of. Here, hours are authored content.
- **General inter-room air mixing.** [thermal.md](../subsystems/thermal.md)
  lists ventilation as a deliberate non-goal, and that stands for
  *room-to-room*. What this build adds is strictly **room-to-outside**,
  which is a different term with a different justification (S6).
- **Night as a crime window** — patrols, curfew, who is abroad at 3 a.m.
  → [policing-slate](../slates/builds/policing-slate.md). This build
  makes the dark; it does not populate it.
- **Coverings as insulation** — a rug, snow over paving → the ground
  build's own named seam,
  [field-substrate-slate](../slates/tails/field-substrate-slate.md).
- **Weather coming indoors** — rain through a hole, a draught you can
  feel as wind → nowhere, deliberately. The envelope is two states, not
  four.

---

## Placement

**The mechanism is the kernel's.** Light, thermal and biome are kernel
subsystems, and the envelope is a rule about how one room's state
resolves — it belongs where the read already lives. Nothing here is a
trade's.

**The objects are the commons'.** A hearth, a stove and a lamp are not a
vocation's instruments — anybody's house has one, and the test the
project uses is whether a second instance needs code. It does not:
a second town's street lighting, a second inn's fireplace and a second
cellar's lantern are **rows**.

**Street lamps are the locality's content, and they are not objects.**
Terminus holds title to its own streets — already true in the parcel
record and already stated in its own rows — so its lighting is its
property, in its pack, expressed as a **declaration on the street's own
row** plus a detail beside it (S3). Nothing is propped and nothing is
minted.

**Fuel goods stay with the fuel trade.** Charcoal is theirs; coal and
peat will be extraction's. What this build adds is the *consumer*.

---

## Collisions

**Who already lives here, and what breaks.**

- ⚠⚠ **The cast may die of this.** If the 2026-09-21 cold-tuning finding
  still holds, making rooms cold at night and in winter will kill
  unclothed or unfed NPCs across the realm. **Verify it first**; the
  retune is a goal of this build, not a follow-up.
- ⚠⚠ **The content bill is the largest risk.** 84 of 173 location rows
  author a light value and 89 do not. The authored ones are *noon*
  values — one row says so in its own comment — so outdoor rooms cost
  nothing to convert. **Interiors are the bill**: an interior whose
  light was a constant needs a real source, or it is unusable after
  dusk. Every shipped interior must be walked.
- **Build-3 owns `measure` and `analyze`.** This build adds no
  instrument and changes none. If a reading of a room's warmth or light
  is wanted, it is theirs to place.
- **Build-2's extraction lands coal and peat.** Whichever lands first,
  neither may name the other's rows in code.
- **Build-4 touches Disciplines.** This build adds none.
- **The Lounge is off-map but indoors** — it gets an envelope like
  everything else, and its answer is the obvious one: a fire in the bar.
  Saxonberg joining the map remains a non-goal; nothing here changes it.
- **Sandbox circles, the practicum, and other authored interiors with no
  opening** — each must be given a source or deliberately left dark.
- **The Hearthworks** already runs forges, a woodshed and a sealed
  cellar, and its rules about heat are load-bearing. It is the sharpest
  test of S5 and should be driven.
- **The mine and the cellars** are already dark or cold by design and
  must not get worse by accident.

---

## Surface decisions

### S1 — Night is a moonlight floor, not a black screen

A full moon high in a clear sky is **enough to move by**: you can make
out shapes, find a door, and see that somebody is there — not read, not
judge a colour, not tell one stranger from another. A new moon, a set
moon or heavy cloud takes that away and you need a light.

*Why:* a game where half of playtime is a black screen is not a game,
and the moon is already modelled to phase and altitude. This also makes
the difference between moon and lamp **reliability rather than
brightness** — which is the honest reason a town buys lamps, and it
falls out of the arithmetic instead of being asserted.

### S2 — Every room's light has a named source

Three sources, and nothing else: **the sky** (only where a room is open
to it, directly or through an opening), **something lit in the room**,
and **spill through an open boundary** from an adjacent lit space.
A room with none of the three is dark.

*Why:* it is the whole content of this build stated as a rule, and it is
checkable — a room that claims light with no source is exactly today's
bug, and this build should leave behind a census that refuses it.

### S3 — Street lighting is public

The town's lamps are the town's property on the town's streets. They
burn fuel, the town's treasury buys the fuel, and a seat is answerable
for keeping them lit. **When the town does not pay, the streets go
dark** — that is the failure mode and it is the point.

*Why:* it is the honest form. A street lamp is a thing nobody can be
excluded from and everybody benefits from, which is the definition of
the problem a polity exists to solve — and this realm already has a
polity, a treasury, seats and titled streets. No new civic machinery is
invented here; appropriation and taxation stay the civic build's.

⭐⭐ **And the lamps are a PROPERTY of the street, not objects.** A street
declares that the town lights it; whether it is lit right now is
**derived** — the service is funded, it is after dusk, so the street is
lit. The lamps themselves are prose: a dynamic detail you can `look at`,
which says whether they are burning. **Nothing is minted.**

*Why:* the realm has already ruled on this question twice, in opposite
directions, and the test that separates them is *is it the target of a
verb?*

- The University Avenue **clock tower** is not an object — *"fixed
  scenery whose only job is to show true time needs no mechanism and no
  instanceable class; the detail seam is enough"*
  ([time.md](../subsystems/time.md)). Nobody binds a tower.
- The **floor** IS an object, one per room, and the ground build paid
  0.76 ms a room for it with the measurement written down — because
  `dig` has to bind it ([ground.md](../subsystems/ground.md)).

Nobody binds a street lamp. Every act that matters — funding the
service, walking the round, the street being lit or dark — happens at
**street** granularity, and 41 of the realm's rows name an outdoor
biome. Minting one identical fuelled object per street would be 41 fuel
reserves reconciling on read to produce a number that is the same for
all of them.

⭐ It also gives the civic half its honest shape: **the town's fuel bill
is one figure in one place.** A town does not track lamps. It funds a
service, and finds out it is short when the streets go dark.

⚠ **The escape hatch, and it is the shipped pattern.** Forestry ships
*four representations of a tree* — a place, a slot-plant, a record, a
prop — chosen by what the fiction needs at that spot. If a later build
wants an individual lamp smashed, doused or climbed (a stealth or
policing feature), **that** lamp becomes a prop at **that** spot and
every other street keeps the property. A second representation where
something acts on it; not 41 of them on the chance.

⭐ The rule this generalizes to, and the one the build should hold:
**a light is an object where somebody acts on it, and a property where
the town runs it.** Indoors is where objects earn their place — a
tavern's lamp and a hearth are things you ignite, feed and run out of.

### S4 — A room's warmth has a named source, and the room leaks

An indoor room's temperature is **derived**: it drifts toward outside at
a rate the room's construction and its openings set, and it is pushed up
by whatever is burning in it. An unheated room in winter is cold. A
heated room with the door open is expensive.

*Why:* it is the same shape as S2, for the other commodity, and it is
the thing that makes fuel worth buying.

### S5 — A hearth warms its room; a forge still does not

The existing rule — *a lit forge must not warm the room it stands in* —
is **kept**, because it protects a real distinction between being inside
the fire and being near it. What this build adds is a **different kind
of object whose entire purpose is the room**: a hearth, a stove, a
brazier. A forge heats what you put in it; a hearth heats where you
stand.

*Why:* the alternative — making every fire warm its room — would break a
deliberate, well-argued rule to get a feature, and would make a smithy
uninhabitable. Two objects, two claims.

### S6 — The prohibition being lifted, and how far

[thermal.md](../subsystems/thermal.md) lists ventilation — inter-room
air mixing — as a deliberate non-goal. This build **narrows** that,
it does not abolish it: a room exchanges heat with **outside**, and
openings set the rate. Rooms still do not mix air with each other as a
general mechanism.

*Why:* the non-goal was written to avoid a general airflow simulation,
which is still the right call. An envelope term is one number per room,
not a network — and without it the whole build is impossible, which is a
reason, which is what lifting a prohibition requires.

### S7 — Nothing is piped

Every source in this build is **local and portable**: a lamp you fill, a
hearth you feed, a lamp the town's lamplighter fills. No mains, no
meter, no bill, no network walk.

*Why:* piped supply must be designed **once**, against the two shapes
already shipped, and that is a build of its own. Doing it here would
produce a third shape.

### S8 — Hours that bite

Businesses already author their opening hours, and 27 of 43 authored
roster windows currently say *around the clock*. The content pass gives
the realm honest hours: most places shut, a few do not, and the street
empties.

*Why:* it is the cheapest possible proof that the clock is real, it is
pure content, and it is what makes a night shift mean something later.

### S9 — Some eyes are better than others

The per-species night-vision property finally does something: a species
with better night vision moves by starlight where a human needs the
moon.

*Why:* it ships, it has never been exercised, and darkness is the only
thing that could ever have exercised it.

---

## Lens pass

**1 — Pedagogy.** The lesson is the **energy balance**: heat in versus
heat out, and the cost of an opening. It is taught by living in it — the
room with the window is bright and cold, the cellar is dark and steady,
the fire you left burning ate a day's fuel. Solar geometry is already
instrumented and becomes legible for the first time: the sun is low,
therefore it is cold, therefore the day is short, and all three are the
same fact. No new Discipline; existing ones (the collier's, the
awareness of the dark) gain a reason.

**2 — Creative expression.** The ordinary case needs no code: author a
room, give it an opening and a hearth, and it gets a day cycle, a
winter, and a fuel bill for free. The bespoke cases stay expressible — a
cellar with no opening, a glasshouse that is all opening, a forge that
heats its work and not its room, a cave that is the same temperature all
year.

**3 — Immersion & roleplay.** This is the largest single immersion
change available to the project and it requires no scripting at all. The
tavern is warm and the street is not. People go home. The lamps come on.
⭐ Nobody has to *write* "it is cold outside" — it is cold outside.

**4 — Values.** The choice it forces is real and recurring: **fuel is
finite and costs money.** Keep the hearth going for the customers or
save the fuel? And at the civic level, the sharper one — when the town
is short, **whose streets go dark first?** That is a judgement about
people, so it needs a criterion and an appeal, and naming it is part of
the build.

**5 — Epochs & magic.** The mechanism is identical from a Roman brazier
to a gas lamp to the mana lamp the arcana pack already ships. Only the
fuel and the flux change. Nothing in the rule knows which era it is in.

**6 — Economy & governance.** *Produces:* warmth, light. *Consumes:*
fuel — charcoal today, coal and peat when extraction lands. *Who pays:*
the household, the business, and the town treasury for the streets.
*Was the demand there first?* ⭐ **No — and that is precisely why this
build comes before the energy industry.** There is no demand for fuel in
this realm today, so an energy trade built now would be a solution in
search of a problem. This build creates the demand honestly, by making
the world physical, and the industry then has customers waiting.

---

## The drive

What a person does, in order, in the live game. Advancing the clock is
an operator act (a game day is two real hours, so the drive either waits
or advances); everything else is typed by a player with no privileges.

1. **Noon, on the street outside the terminal hall.** `look`. The street
   is bright. `analyze sky` agrees the sun is high.
2. **Advance to dusk.** `look` again from the same spot: the street is
   dimmer than it was, and the prose says so without naming a number.
3. **Full night, clear sky, moon up.** Step outside. You can still make
   out the street, the doorways and anybody standing there — but not
   read a sign or tell a stranger's face.
4. **Try to read something.** Refused, and the refusal says why: it is
   too dark, not that the thing is unreadable.
5. **Light a lantern you bought at the general store** (`light lantern`).
   The street around you reads as lit enough to work by. `douse` it and
   the dark comes back.
6. **Walk onto a lit street.** The town's lamps carry it without your
   lantern. Put your lantern out and keep walking — you are fine here.
7. **Walk to a street the town does not light** — one it never lit, or
   one whose service has lapsed. That stretch is dark, and `look at the
   lamps` says they are standing cold, not that they are broken or that
   there are none.
8. **New moon or heavy overcast.** The same walk without a light is
   genuinely dark — you can move, but the street tells you nothing.
9. **Go indoors, into an unheated room, in winter.** `feel` reports the
   cold; the body line in `look` reports that you are losing heat.
   Standing there has a cost you can see.
10. **Light the hearth** (`light hearth`) with fuel in it. The room
    warms **over minutes, not instantly**, and `feel` tracks it.
11. **Open the door and leave it open.** The room cools measurably
    faster. Shut it and it holds.
12. **Let the fire burn out.** The fuel is gone, the fire is out, and the
    room drifts back toward outside.
13. **A shop at night.** It is shut, the keeper has gone, and the windows
    are dark. The same shop at ten in the morning is open and lit.
14. **Dawn.** The street lightens on its own. The lamps go out.
15. **A whole game day, unattended.** Nothing dies of cold that should
    not — the cast survives the night in its own rooms, dressed as it
    ships.

---

## Acceptance criteria

Observable from outside the code. Each one names what a **person** sees.

1. A player standing on the same street at noon and at midnight gets
   **two different descriptions**, and neither of them was authored.
2. On a clear night with a full moon, a player outdoors can move, find a
   door and see that somebody is present — and **cannot** read, or tell
   a stranger's face.
3. On a moonless or heavily overcast night, the same player **needs a
   light**, and the game says so when they try to do without.
4. A player who lights a lantern can work by it; when it goes out, the
   dark returns immediately.
5. A player walking a lit town street at night needs no lantern; a player
   walking an unlit one does.
6. A street the town is not lighting is **dark**, and looking at its
   lamps says they are standing cold — ⭐ **with no lamp object anywhere
   in the world.** The lamps are a property of the street and prose
   beside it; a census finds none minted.
7. **No room in the realm shows light without a source** — a census over
   the shipped content reports none, and refuses a new one.
8. A player standing in an unheated room in winter can tell they are cold
   from ordinary play — the description and their own body line — without
   reading a number.
9. Lighting a hearth warms the room **gradually**, and a player can feel
   the difference between just-lit and long-lit.
10. Leaving the door open measurably costs warmth; shutting it stops the
    loss.
11. A fire left burning **runs out of fuel** and the room cools.
12. A forge, lit, does **not** warm the room it stands in — and a smith
    can still work beside it.
13. Most businesses are **shut at night**, their staff are gone, and the
    street is emptier than it is at noon.
14. A player who logs in at dawn sees the town wake: light returning, the
    lamps going out, shops opening.
15. ⚠ **A world left to itself for a full game day kills nobody of cold.**
    The cast, dressed and fed as it ships, survives its own nights.
16. A second town needs **zero code** to have lit streets, heated
    interiors and a day cycle — rows only.

---

## Cross-references

**Seeding slates**
- [power-utility-slate](../slates/builds/power-utility-slate.md) — the
  supply ladder and the demand cases this build stops short of
- [grid-slate](../slates/builds/grid-slate.md) — the network, explicitly
  out of scope here
- [delivery-slate](../slates/builds/delivery-slate.md) — providers,
  coverage and metering as one substrate; ⚠ the two shipped shapes
- [fridge-design-pack](../slates/builds/fridge-design-pack.md) — names
  "the appliance/energy build" this one precedes
- [supply-design-pack](../slates/tails/supply-design-pack.md) — the
  connect act, deferred with the piped tier

**Subsystem docs this build changes the truth of**
- [light.md](../subsystems/light.md) — ambient as a derived quantity
- [thermal.md](../subsystems/thermal.md) — the envelope term, the
  narrowed ventilation non-goal, the retuned cold dials
- [time.md](../subsystems/time.md) — the sun's first non-instrument
  consumer; the D6 seam finally closed
- [weather.md](../subsystems/weather.md) — the dim factor gains a sibling
- [biome.md](../subsystems/biome.md) — indoor temperature stops being a
  declared default
- [fire.md](../subsystems/fire.md) — the room-heating object
- [ground.md](../subsystems/ground.md) — the floor as part of the
  envelope; coverings stay its seam

**Related work in flight**
- [extraction-slate](../slates/builds/extraction-slate.md) — coal and
  peat, planned, on the ground track
- [instrumentation](../slates/builds/instrumentation-slate.md) —
  owns `measure` / `analyze`; no instrument is added here
- [crew-slate](../slates/builds/crew-slate.md) +
  [livelihood-slate](../slates/builds/livelihood-slate.md) — the labor
  build this one is sequenced ahead of, and why
