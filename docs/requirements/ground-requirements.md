# Ground — requirements

**Kind:** feature — substrate, and a live defect fix
**Leads from:** kernel. ⭐⭐ **First consumer, named: it already shipped and it
is broken.** `sit`, `lie` and `kneel` are the substrate's first consumers, they
are in the game today, and **they do not work** (driven and confirmed below).
The second consumer is `dig` in the extraction build, which is blocked on this
one. Nothing here ships unexercised.

Executes [ground-slate](../slates/builds/ground-slate.md). Three different things
in this world are called *ground* — the floor you stand on, the soil that grows
things, and the strata underneath — and they are modelled in three vocabularies
owned by three different places, with no single owner of the concept. The
cheapest of the three is barely modelled at all: **a Location has no material
field, 27 of 180 Location rows mention a floor, and the whole ground-posture
family cannot bind in the room a new player starts in.** This build makes the
ground one thing that answers *what is underfoot*, gives every Location a floor
you can target, and lets the extraction build's `dig` read it.

---

## ⚠⚠ Driven first, because the slate said to

The slate's first open question was *does the posture bug reproduce?* It does.
Run over the real socket against a freshly booted world, as a brand-new player
in **the Lounge** — `defaultStartLocation`, the first room anybody ever sees:

| what a person types | what happens |
|---|---|
| `sit` | **declined** — nothing matched the target |
| `lie` | **declined** — nothing matched the target |
| `kneel` | **declined** — nothing matched the target |
| `look ground` | **declined** — nothing matched |
| `look floor` | **declined** — nothing matched |
| `sit on ground` | **declined** — *the shape is not recognised at all* |
| `stand` | ok (it vacates a slot and needs no target) |

So: **a new player cannot sit down, lie down, kneel, or look at the floor.** The
three posture verbs each default to the keyword `ground` and require a
posture-bearing target; the only thing in the game that is posture-bearing ground
is a floor, and the Lounge has none. ⭐ A second and separate defect fell out of
the same probe: the prepositional form does not parse, so even a player who knows
to name the ground cannot reach it that way.

*(Observation, not this build's: three of the twelve reachable things in the
starting room render as "something". Worth somebody's attention — recorded under
Collisions.)*

---

## What already exists

**Verbs near this.** `sit` · `lie` · `kneel` · `stand` (postures, the platform's)
each name the ground as their default target. `look` and `search` would target a
floor if one existed. Farming's `grub` · `ditch` · `plough` · `lime` work ground
but only a field's. `fell` works a wood's ground. `hew` works a mine's rock.
**Nothing anywhere asks what a room's floor is made of.**

**The three vocabularies.** *The floor* — a floor is a Thing carrying a material
and able to bear a posture, hold a puddle and take an adornment; **six floor rows
exist in the entire game** and nothing attaches one by default. *The soil* — the
growing reserves are the engine's and reach a garden bed, a plant pot, a field
and a wood, but the **seeded** half (texture, drainage, aspect, depth, stoniness,
sourness) belongs to the **farming trade** and reaches a field only. *The strata*
— the column of rock at depth belongs to the **mining trade** and exists in one
place in the world.

**And the engine already admits the problem.** A zone carries two authorable
citations for ground — one for the strata, one for the surface character — and
**interprets neither**, because a trade cannot add a field to an engine class and
the failure when it tries is silent.

**Trades and packs.** No pack owns ground. Farming, forestry and mining each own
a piece; the water pack is the precedent for a system that other packs' content
merely *names*.

**Disciplines.** None, and none is wanted — this is substrate. Working ground is
already covered by farming's, forestry's and mining's own, and quarrying's
arrives with extraction.

**Overlapping slates.** `field-substrate-slate` holds the seeded-versus-derived
seam and the later RGO-interface unification; `extraction-slate` is blocked on
this build; `rejection-slate` owns how *dense* one hillside's column may honestly
be. None is a second owner.

> **Therefore what is genuinely new here is: a floor in every room, one question
> it can answer — *what am I standing on* — and one owner for the three grounds.**
> Everything else is a shipped thing being attached, a shipped citation being
> interpreted, or a shipped trade's model being moved to where two trades can
> read it.

---

## Goals

- **Every Location has a floor**, and it is a real thing a person can look at,
  sit on, lie on, kneel on and name in a command — without an author placing one.
- **The three ground postures work everywhere**, starting with the room a new
  player opens their eyes in.
- **A floor knows what it is made of**, answered by a ladder that prefers what an
  author said and falls back to what the world can derive — so an author who
  wants flagstone says flagstone, and an author who says nothing still gets an
  honest answer.
- ⭐ **A floor knows whether it is on the ground.** A cottage's beaten-earth
  floor is; the loft above it is not; both are floors in one building. This is
  what makes the model work indoors, upstairs, and on a deck that moves.
- **One owner for ground.** The strata and the surface character stop belonging
  to two separate trades, so a village with a clay pit can describe its ground
  without installing the mining trade, and a wood can have drainage without
  installing the farming trade.
- **The floor is targetable and queryable separately from the room it is in**, so
  a command can act on the ground without acting on the location.
- **`dig` has something to dig.** The extraction build asks a floor two
  questions — what are you, and are you on the ground — and gets answers.
- ⭐⭐ **Two rooms whose ground is the same behave the same, by construction and
  not by anybody remembering to make it so.** There is a **closed set of ground
  kinds** — the finite list of things ground can be in this world — and a floor's
  kind is **worked out** from what it is made of and whether the ground continues
  beneath it, never hand-picked. An author who invents a new material gets a kind
  for free.
- **Somebody can see the whole picture at once.** A build-time census lists every
  Location and the ground it resolved to — and separately, **every room whose
  description makes a claim about the ground that nothing backs up.** The second
  list is the worksheet for the content pass, and its length may only fall.
- **Nothing gets slower or heavier for it**: a room nobody is in costs nothing
  extra, and a floor nobody changed remembers nothing.

## Non-goals

- **Choosing a composition room by room** — boards in the bar, flagstone in the
  bank. The fallbacks answer all 180 Locations honestly; picking per room is
  content work → the 1.0 content pass, recorded on
  [rejection-slate](../slates/builds/rejection-slate.md), and the localities'
  own packs.
- **The other things that should care what you stand on** — slipping, footstep
  sound, fire spreading across a board floor, tracks left in mud, bare feet on
  broken glass. Each is a small wiring job once the question can be asked, and
  each belongs to its own subsystem: [locomotion.md](../subsystems/locomotion.md)
  · [senses.md](../subsystems/senses.md) · [fire.md](../subsystems/fire.md) ·
  [stealth.md](../subsystems/stealth.md) ·
  [materials-response.md](../subsystems/materials-response.md).
- **Giving every zone a strata column** so every room can derive from it. The
  ladder degrades honestly without one → the coverage half of the audit; nowhere
  yet, deliberately, and it is named in the drive as a thing that must *not*
  break.
- **The rest of the RGO-interface unification** — the derived half, the covers, how
  strata and soil compose →
  [field-substrate-slate](../slates/tails/field-substrate-slate.md).
- **Filling the gaps this exposes** — a wood with no drainage, a mine room with no
  soil. Real, and cheap once one owner answers both; naming them is the audit's
  job, not this build's.
- **Quarrying, digging, and anything that takes material out of the ground** →
  [extraction-slate](../slates/builds/extraction-slate.md), the build directly
  after this one.
- **The behaviour of an exotic ground** — Limbo Lane's bounce, ice's slipperiness,
  a floor that glows. The **material is modelled** and the behaviour stays prose,
  which is what the demo-content design already committed to: *"no bounce
  mechanics in v1 — the material is modeled, the behavior stays prose, stated
  honestly."* → whichever subsystem eventually owns the effect
  ([locomotion.md](../subsystems/locomotion.md) for spring and slip,
  [light.md](../subsystems/light.md) for a glow).
- **The three things in the starting room that render as "something"** → recorded
  under Collisions for whoever owns it; not fixed here.

---

## Placement

**A new system pack owning ground**, alongside the water pack and for the same
stated reason: *the works, as distinct from the physics — this pack owns what
other packs' content names.* Ground passes the system test cleanly: **it holds
what it holds whether or not anybody digs.** It takes the strata out of the
mining trade and the surface character out of the farming trade, so a locality's
ground row names a system rather than a trade.

**The floor stays the engine's.** Every Location gets one, so it cannot live in a
pack — and the question *what am I standing on* is asked by engine verbs
(`sit`, `look`) before any trade exists.

⭐ **Second-instance test:** a new room with an honest floor needs **zero** rows
and zero code — it inherits one. A room that wants a *particular* floor needs one
authored line. A second village with its own ground needs rows only.

---

## Collisions

- ⚠⚠ **The Lounge** — `defaultStartLocation`, and the room with the confirmed
  failure. It is a warren, so its rooms are generated rather than authored, which
  means the fix cannot be "author a floor row in the lounge."
- ⚠ **The dorm room** — where a new player's first *home* is. Its fixtures are
  the lamp, bed, desk, footlocker and wardrobe, laid down once and captured; it
  has no floor, and the persistence spine means a floor added later must not
  duplicate on every wake.
- **The six rooms that already have a floor** — the default-floor row, the forge
  floor that catches run-off metal, the moor's two, the practicum's brine floor,
  the substation's flooded floor. **Every one must keep working unchanged**, and
  the forge floor and flooded floor already carry behaviour (bulk, grounding) that
  a default must not trample.
- **Puddles.** A spill already pools in a floor's surface slot. Rooms without a
  floor currently cannot hold a puddle — so giving every room a floor silently
  changes where spilled liquid goes. That is correct, and it is a behaviour change
  to watch in the drive.
- **The farming trade** loses the surface character it currently owns; its field
  keeps every read it has today.
- **The mining trade** loses the strata model; Rejection's mine keeps behaving
  identically, and its one deposit row changes what it names.
- **Upper storeys and moving rooms** — the dorm building has floors above ground,
  and a vehicle is a room that moves. Neither may ever derive its floor from
  geology.
- **The holodeck** — a circle is a room too, and its floor must not claim to be
  earth.
- ⭐⭐ **The city's road prose, which is where this design was stress-tested.**
  Four shipped rooms and one designed one, each describing its ground, and every
  one of them must come out right:
  - **the university crossing** — *"underfoot the stone is swept but worn in a
    diagonal track"*: set paving, on the ground, **and a durable wear fact the
    prose commits to**;
  - **the market square** — *"a cobbled square"*: the clean case;
  - **the goods yard** — *"a long cobbled strip … with a gutter running the
    length of it"*: paving plus a drainage feature, and doors *"a different height
    off the ground"*;
  - **Hinkley's lane** — *"a made road with nothing on it"*, with grass growing
    through: ⚠ the ambiguous one, and the reason kinds are worked out rather than
    chosen;
  - ⭐ **Limbo Lane** (designed, not built) — *"an odd pink material… soft,
    rubbery, faintly aglow, and it springs underfoot"*: paved, on the ground, and
    nothing like paving. **This is the case that must work without the list
    changing.**
- ⚠ **Three of twelve reachable things in the starting room render as
  "something"** — observed while driving. Not this build's, but somebody should
  look: in a lit room that reads like missing descriptions rather than darkness.

---

## Surface decisions

### A floor is a Thing, not a property of the room

Two reasons, and the first is not a preference. **A command names things.** For a
person to `look at the floor`, `search the ground` or `dig here`, the ground has
to *be* something the game can find and refer to — a property of the room gives
nothing to name. And the ability to sit or lie on the ground is carried by the
floor itself: that is where the game keeps *somewhere a body can be*. A room
without a floor is a room you cannot sit down in, which is exactly the bug.

### Every Location gets one, unless it says otherwise

The alternative — authoring a floor into 180 rooms — is how we got 27. An author
who wants something particular says so and is obeyed; an author who says nothing
gets an honest floor rather than nothing at all.

**And it is affordable because rooms already come and go.** A room nobody has
visited is not loaded, and its floor is not either; a floor nobody has changed
has nothing worth remembering. This build does not add a thing to the world's
permanent furniture — it adds one to each room that is *currently in use*.

### What it is made of: a ladder, authored first

In order: **what this floor says it is** → **what the room says its floor is** →
**what the ground beneath says**, if this floor is on the ground → **what rooms of
this kind use** → **the plain default**. The first answer wins.

That shape is how everything else in this world resolves, and it means the
derived case never fights an author.

### ⭐⭐ Ground kinds are worked out, never chosen

There is a closed list of kinds — earth · rock · loose · mire · set paving ·
beaten floor · boards · slab · plate · contrived — but **an author never picks
from it.** A floor's kind follows from two things: **what it is made of**, which
the material already knows, and **whether the ground continues beneath it**.

This was settled by stress-testing the design against the city's own road prose,
and one room broke the alternative outright. Limbo Lane is designed as *"an odd
pink material… soft, rubbery, faintly aglow, and it springs underfoot"* — a road,
on the ground, and nothing like paving in any way that matters. Had the kind been
a category an author chooses, that road either lies about itself or forces the
list open. Because the kind is worked out, **the author writes what the road is
made of and the answer follows**, with no list to edit.

Three things fall out, and all three are what the goal asked for:

- **The same ground behaves the same by construction.** Two cobbled squares
  cannot diverge, because nothing was chosen for either of them.
- **Subclassing costs one line** — name a material. That is the cheapest
  authoring act in this world and the one authors already know.
- **The list stops being a gate.** It describes the common cases and can never
  refuse an odd floor.

⚠ And it removes a real ambiguity the stress test found: Hinkley's *"made road"*
in newly surveyed country is not obviously paving, gravel or graded earth, and an
author asked to pick a category would have to guess. Asked what it is made of,
they already know.

### On the ground is a property of the floor, not the room

The rung that reads the strata applies only to a floor that says it sits on the
ground. ⭐ **This is the whole reason the model works indoors:** a cottage's
earth floor is on the ground and its loft's boards are not, in the same building,
under the same sky. An interior, an upper storey, a ship's deck and a holodeck
circle simply never reach that rung, and nothing has to special-case them.

### Wear, gutters and worn tracks are details, not kinds

The prose already commits to durable facts about the ground: the city crossing's
stone is *"swept but worn in a diagonal track, the way a hundred thousand
arrivals have already crossed it"*; the goods yard has *"a gutter running the
length of it"*. **None of these is a kind and none may be allowed to become
one** — a list that grows a member for every worn flagstone is not a closed list.

They are **details on the floor**, which is a thing that can already carry them.
⭐ The demo-content design reached the same conclusion independently, specifying
the pink lane's `paving` as a detail with a touch slot — *"press it and it presses
back"*. So the mechanism exists and nothing new is needed.

### One thing called ground, sampled at three depths

The floor, the soil and the strata are one column read at different depths — the
floor is its top. That is why they get one owner. ⚠ **But the column is one rung
of the ladder and never the model**, because most rooms in the world have no
column and never will, and a model that requires one would be a model that
excludes every interior.

### The ground postures keep working the way they read

`sit` with no argument still means *sit on the ground here*. The fix is that the
ground is now there to be sat on. ⭐ And `sit on the ground` — the form a person
naturally types, which currently is not even understood — must work too.

### The census is two lists, and the second is the useful one

The first list is every Location and the ground it resolved to — proof that all
180 are accounted for, and a flag on any that fell through to the plain default.

⭐⭐ The second list is **every room whose description makes a claim about the
ground that nothing backs up**, found by reading the prose rather than the rows.
The crossing says *"underfoot the stone…"*; an alley says *"broken bottles
underfoot"*; a yard describes its gutter. Each is the world promising something
the model cannot answer — the same class of gap as the wall built *"out of the
bigger pieces"* with no building stone in the game.

That second list is what the content pass actually needs, and **its length may
only fall**, never rise.

### What this build does not decide

Which material each of the 180 rooms should have. The fallbacks make every room
honest; making every room *particular* is content, and it is the 1.0 pass's.

---

## Lens pass

**1 · Pedagogy.** The world becomes derivable underfoot: a heath's floor is peat
because the ground there is peat, and a quarry's floor changes as it is dug out.
The same column answers the plant, the pick and the boot, so a player who
understands one understands the others. ⚠ **Gap, recorded:** this build exercises
no Discipline and teaches nothing by itself. It is the precondition for three
things that do, and that is the honest reading rather than a claim to fill in.

**2 · Creative expression.** ⭐ The ordinary case becomes **nothing at all** —
every room gets an honest floor with no authoring, where today 153 of 180 have
none. The bespoke case is one line, and it beats every derivation. A room that
wants a floor of lava, glass or ice says so and is obeyed.

**3 · Immersion & roleplay.** You can sit down. Anywhere. That is supposed to be
true already and is the plainest possible statement of what this fixes. You can
look at the floor and be told something true about it. And the fiction that
already promises floor consequences — broken bottles underfoot in an alley, a
forge floor that catches run-off — gets something real to hang on.

**4 · Values.** Thin, and recorded as thin. This confers no standing and forces
no choice; the choices belong to its consumers — what you may dig, and whose
ground it is.

**5 · Technology & magic.** A floor is a floor from a cave to an orbital deck;
what varies is what it is made of and whether anything is beneath it. *On the
ground* is precisely the axis that survives every epoch — a spacecraft's deck is
not on the ground, and neither is a fourth-floor flat.

**6 · Economy.** Produces nothing directly and is not meant to. It is the
precondition for quarrying, for foraging's patches, and for every act that cares
what it is standing on. It consumes one thing per room in use, paid back by every
consumer that would otherwise invent its own ground. ⚠ **The demand is not
speculative: three shipped verbs are asking for this right now and being
refused.**

---

## The drive

Run against the running game before the MR opens. Steps 1–4 are the confirmed
failures; they must become successes.

1. Log in as a brand-new character. You are in the Lounge.
2. `sit` → you sit down on the ground. `stand` → you get up.
3. `lie` → you lie down. `kneel` → you kneel. `stand` between each.
4. `look floor` and `look ground` → both answer, and the answer says what it is
   made of in words.
5. `sit on the ground` → works, in the form a person would actually type.
6. Walk to three more rooms of different kinds — an interior, a street, and the
   dorm room — and `sit` in each. All three work.
7. In the dorm room, `look floor` → it reads as a built floor, not as earth.
8. Log out and back in. `look floor` in the dorm → the same floor, not a second
   one beside it.
9. Go outdoors somewhere over ground that has a described character — a field —
   and `look floor`. It reads as that ground, not as boards.
10. Go to the moor and `look floor`. It reads as peat, and the moor's own authored
    floor is still what answers — the author's version, not a derived guess.
11. Go to the forge and `look floor`. It is still the forge floor, and pouring
    something on it still pools the way it did before this build.
12. Go up a storey in a building and `look floor`. It reads as a built floor and
    **not** as whatever earth is beneath the building.
13. In a holodeck circle, `look floor` → it answers, and it does not claim to be
    earth.
14. Spill a liquid in a room that had no floor before. It pools, and `look floor`
    says so.
15. `search floor` and `look at the ground` in two rooms → the floor is a thing
    commands can reach, distinct from the room.
16. Go to the mine at Rejection and work a face. Everything about the mine behaves
    exactly as it did — the faces, the ground reading, the air.
17. Go to a field and `grub`, `ditch` and `lime` it. All three behave exactly as
    they did.
18. Ask the game what a wood's ground is like → it answers, where before only a
    field could.
19. In a room whose zone has no described ground at all, `look floor` → still a
    sensible answer, and nothing errors.
20. **The road walk.** `look floor` in the university crossing, the market square,
    the goods yard and Hinkley's lane. Each answers, each matches what its own
    description already says, and the two cobbled ones read the same as each
    other.
21. In the crossing, `look paving` (or the detail the prose names) → the worn
    diagonal track answers as a detail of the floor, not as a separate kind of
    ground.
22. Author a floor of an invented material — the pink of Limbo Lane — in a test
    room. `look floor` answers, `sit` works, and **nothing in the closed list had
    to change** to allow it.
23. Author a second room with the same material and the same on-grade answer.
    Both behave identically without anybody having chosen anything.
24. Read the census. Every Location appears with the ground it resolved to, and
    the second list names the rooms whose prose claims a ground nothing backs —
    including the crossing's *underfoot*, the alley's broken bottles and the
    yard's gutter, unless this build has already answered them.

---

## Acceptance criteria

Observable from outside the code, by a person playing.

1. **A brand-new player can sit, lie and kneel in the first room they see** — the
   three commands that are refused today.
2. **`sit on the ground` works**, not only bare `sit`.
3. `look floor` and `look ground` answer in every room, and the answer names what
   the floor is made of in words a person can read.
4. The floor is a thing commands reach on its own — it can be looked at,
   searched, and named as a target, separately from the room.
5. **Every one of the six rooms that already has an authored floor keeps it**, and
   the forge floor still catches what is poured on it.
6. A room that authors a floor does not end up with two.
7. A floor in a built interior reads as built; **a floor above ground level never
   reads as earth**; a holodeck floor never claims to be earth.
8. An outdoor floor over described ground reads as that ground.
9. Where an author has said what a floor is, that is what it says — always, over
   anything the world would otherwise derive.
10. In a room whose surroundings describe no ground at all, the floor still
    answers sensibly and nothing fails.
11. A liquid spilled in a room that previously had no floor now pools there.
12. **The mine behaves identically** — faces, ground reading, air, and every act.
13. **A field behaves identically** — clearing, draining and liming all unchanged.
14. A wood can be asked what its ground is like, and answers.
15. A person's own floor survives logging out and back in without duplicating.
16. **Nothing a player does gets noticeably slower**, and an unvisited room costs
    nothing.
17. **Two rooms made of the same ground read and behave the same**, and nobody had
    to choose that — the two cobbled rooms are the shipped proof.
18. ⭐ **A floor of an invented material works without the closed list changing** —
    it can be looked at, sat on, and described, and it reports a ground kind.
19. The ground a room's description already claims is the ground the game reports:
    the crossing's stone reads as stone, the cobbled square as cobble, and neither
    contradicts its own prose.
20. A worn track, a gutter and similar durable facts are reachable as details of
    the floor, and none of them is a separate kind of ground.
21. **The census exists and can be read**: every Location with the ground it
    resolved to, plus the rooms whose prose claims a ground nothing backs. The
    second list's length may only fall.

---

## Cross-references

- **Seeding slate:** [ground-slate](../slates/builds/ground-slate.md) — the three
  vocabularies, the thesis, the five-rung ladder, four open questions.
- **Blocked on this build:**
  [extraction-slate](../slates/builds/extraction-slate.md) +
  [extraction-requirements](./extraction-requirements.md) +
  [extraction-plan](../plans/extraction-plan.md) (whose W0 is superseded by this
  build).
- **Owns what this defers:**
  [field-substrate-slate](../slates/tails/field-substrate-slate.md) (the rest of
  the unification) · [rejection-slate](../slates/builds/rejection-slate.md) (column
  density, and the 1.0 content pass).
- **Subsystem docs:** [location.md](../subsystems/location.md) ·
  [posture.md](../subsystems/posture.md) · [slot.md](../subsystems/slot.md) ·
  [soil.md](../subsystems/soil.md) · [mining.md](../subsystems/mining.md) ·
  [zone.md](../subsystems/zone.md) · [residency.md](../subsystems/residency.md) ·
  [furnishing.md](../subsystems/furnishing.md) ·
  [bulk.md](../subsystems/bulk.md) (the puddle) ·
  [content-packs.md](../subsystems/content-packs.md).
- **Related requirements in flight:** `extraction-requirements.md` — written, and
  waiting on this.
