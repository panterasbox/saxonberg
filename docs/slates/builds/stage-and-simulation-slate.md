# Stage and simulation slate — one arrow of time, and the stories told on it

> **Status: UNBUILT** — designed at high level 2026-10-29 with the owner. What ships: the world
> clock, one game-time axis at a runtime scale ([time.md](../../subsystems/time.md)); age as a date
> (`bornAt`) and the species age curve ([race.md](../../subsystems/race.md)); the Cast/Extra rungs —
> a person against a role ([identity.md](../../subsystems/identity.md)); per-zone celestial profiles;
> the sandbox circle as a bounded stage ([sandbox.md](../../subsystems/sandbox.md)); one identity
> over several named bodies, for players ([avatar-family-slate](./avatar-family-slate.md)); restaging
> (*"anything staged gets restaged"*, the owner, 2026-10-28). Nothing expresses *the same place at
> another time*.
> **Left:** Coordinated Metaversal Time as the one arrow · derived locality clocks and their
> registry · every age a date with one owner · role age, aged by recasting · the three rules against
> dissociation · lifespans paced to be witnessed · the time-shifted zone (the relation, the derived
> clock, one identity with a body per era, what crosses) · staging in place as the alternative
> **Size:** a build

Siblings: [pace-slate](./pace-slate.md) (whose attention a duration fits) ·
[lineage-slate](./lineage-slate.md) (the player's age band) ·
[mortal-vessel-slate](./mortal-vessel-slate.md) Thesis 8 (ecology-level against narrative-level
cycling) · [household-lifecycle-slate](./household-lifecycle-slate.md) (succession).

## 0. The ask **[DECIDED — the owner]**

*"This application is a simulation. It wants to just run and keep its own internal state; it's not
started and it's never finished, it just responds to whatever users input into it through the
command bus. And if there were never a user it'd still be a simulation. That's one end of things.
But on the other end is that we're not just a simulation, we're a medium for narratives to be told.
Narratives are staged; they have beginnings, middles and ends. Unless you're Richard Linklater you
don't make a movie for 18 years — you get a few different actors to play the kid at different ages
and stitch them together. … Staged things also then need to be re-staged, or even de-staged
(struck). The simulation suggests one aging model, but the stage wants another. … There's no reason
we have to only track one number."*

## 1. ⭐⭐⭐ One arrow — Coordinated Metaversal Time **[DECIDED — the owner]**

*"What I want, at least to start with, is a single 'Coordinated Metaversal Time', MTC, and it runs
across all dimensions and realities as a single arrow — which I guess implies that the metaverse
experiences entropy, but whatever, we can figure out what that means for us. If individual
localities want to run their own clocks, I'd prefer they be derived, and we can provide some
registry or catalog for time zones and such."*

- **MTC is the world clock** — one game-time axis for every place, circle and realm, related to real
  time by the scale ([pace-slate](./pace-slate.md)).
- **A locality's clock is derived, never independent** — an offset, a calendar, a celestial
  profile, read off MTC. The registry is a catalog of these, the same shape as every other
  catalogue (rows, warmed on read).
- **One arrow** — nothing in the design moves MTC backward. measurement.md's A16 (every
  reconcile-on-read consumer tolerates a backward clock) stays as a *defence* against test seams
  and restores, never a design permission.
- ⭐ **"Ten years later" is a derived clock, not time travel** (§ 5): MTC still runs one way.

## 2. Two kinds of time **[DECIDED — the owner]**

**Simulated time** — one continuous *t*, never started, never finished, running whether anyone
watches. **Story time** — a narrative's own position: beginnings and endings, jumps, *"ten years
later"*. Continuous media have hosted staged time for a long while, each with its dissociation:

| medium | how | the seam |
|---|---|---|
| film | Linklater shoots for twelve years; everyone else recasts the kid | the cut hides it |
| soap operas | the child leaves on vacation and returns 17, played by a new actor | a known convention |
| comics | the sliding timescale — perpetually 28, the origin moving forward | dates mean nothing |
| MMOs | the boss respawns; phasing shows players different states | *"I killed it yesterday"* |

⭐ **Repeat consumption is the model, not the exception** — the owner: *"the best movies are usually
watched over and over again by their more appreciative viewers, or books that people read over and
over."* A staged story is rewatched; what is per-viewer is only the viewer's own memory of it.

## 3. ⭐⭐⭐ Every age is a date, with one owner **[DECIDED — the owner: "all of this mostly works for me"]**

race.md's *age is a date* generalized — several notions of age, no extra clocks:

| age | the date | owned by |
|---|---|---|
| body | born, read through the species curve | the simulation |
| tenure | arrived in the world | the simulation |
| your time | played since creation | the player's own clock |
| ⭐ **role** | the age a story declares — *"the boy, eight"* | **a staging** |

Content writes around whichever interests it. **Role age is aged by recasting**: the Extra rung is
already a role different bodies fill; a story strikes the eight-year-old son and stages the
twenty-two-year-old, as film and soaps do.

### The three rules against dissociation

1. **A character's age has one owner** — the simulation or a staging, never both. A household
   declares which; an innkeeper on a curve with a son recast on a story's schedule is the tear.
2. **A staging's change is told, never silent** — the *"ten years later"* card; the press, the
   ticker, *while you were away*.
3. **One view shows one version** — a divergence lives inside a bounded stage (a circle, an
   instance, a time-shifted zone); otherwise it *is* the world, for everyone in the room.

## 4. ⭐⭐ Lifespans are paced to be witnessed **[DECIDED — the owner: "I buy this more"]**

A lifespan's length is set by **who should see the arc complete**, not by realism. The owner: *"I
dunno if 15 months for a dog is necessarily a bad thing … the pet playing out in your time basically
means it'll outlive their interest in the game for most people — unless they get it already aged."*

| arc | who should see it complete | pace |
|---|---|---|
| a pet's life | its owner, in about a year of play | the calendar (a dog: ~15 real months) |
| an NPC household's generations | the regulars | the calendar |
| livestock | the farmer, many times | the calendar |
| a player character | nobody — it has no arc | — (the age band, [lineage-slate](./lineage-slate.md)) |

A pet's **needs** stay on absence pace (fed by a bowl through a weekend away); its **life** is on the
calendar. Adopting an old animal is choosing a short arc on purpose. **Open:** the owner away for
months — a grave told gently in *while you were away*, or a kennel arranged before leaving.

## 5. ⭐⭐ The time-shifted zone **[DECIDED — the owner's preferred form; the model LEAN]**

The owner: *"I'd probably do something like a 'ten years later' exit on a room to a new zone that
represents the same locations, just shifted in time. We probably need a way to express that in the
model. … You could stay in the same zone and just swap out NPCs — I like my way better, but who knows
without actually seeing it built and applied."*

What the model needs:

- **A relation between two extents** — *this zone is that zone, ten years on*: the same localities
  by the same names, so the address and the map say *"Terminus, ten years later"*, not *"another
  town"*.
- **A derived clock** (§ 1) — MTC plus ten years for the date; the hour and the season still
  MTC's.
- ⭐ **The same people in older bodies** — the son in the later zone is the *same identity* as the
  boy, so belief and the chronicle carry: a player who met the boy recognizes the man. One identity
  with a body per era — the avatar family's precedent, extended to Cast NPCs.
- **What crosses** — players and what they carry walk through; the present does not flow forward
  into an authored later zone. Whether anything a player does now ever appears ten years on is the
  open design question.

**Staging in place** — the same zone, NPCs swapped — is the same machinery without the exit; both
are author choices once staging is expressible.

## 6. The lens pass

1. **Pedagogy** — timescale and dating are honest: one arrow, derived local clocks.
2. **Expression** — authors stage stories with their own time, by exit or in place, on one model.
3. **Immersion** — one view, one version; changes told. **Participation** — stories rewatched,
   remembered per viewer.
4. **Values** — a pet's death is an arc, not a punishment schedule; the absent owner is the hard
   case.
5. **Continuity** — every realm on one arrow.
6. **Economy** — none directly.
7. **Governance** — the scale is the polity's; MTC is not.

## 7. Open

1. **NPCs a player has a history with** — should they lean simulated, so nobody is recast out from
   under a relationship?
2. **What crosses** a time-shifted exit, in either direction.
3. **The absent pet owner** — a grave, a kennel, or both by arrangement.
4. **What entropy means here** — the owner's *"we can figure out what that means for us"*.
