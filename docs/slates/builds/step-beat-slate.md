# Step beat slate — a step takes the time the world says it takes

**Status:** slated 2026-11-10, from the navigation-pane conversation
(what a click on a distant room should do). **Size:** a build, cross-cutting
— locomotion, the client's command queue, combat's beat, NPC movement.
**Not decided:** the owner asked for it written up to be argued, not
adopted; the lens pass below is the case for and against.

Related: [pace-slate](./pace-slate.md) (the world clock and whose attention
a duration must fit) · [locomotion.md](../../subsystems/locomotion.md)
(the paces) · [logistics.md § The Journey](../../subsystems/logistics.md) ·
[map-slate](./map-slate.md) (the click that walks) ·
[exertion.md](../../subsystems/exertion.md) (the run that breaks).

## The problem: on foot, `run` is all downside

`walk`, `sneak` and `run` ship as the three ground paces
([locomotion.md](../../subsystems/locomotion.md)): sneak `speed 0.5`,
quiet, `costMultiplier 1.5`, and it spots a trap a walk would spring; run
`speed 2.0`, loud, `2.0`, and it blunders into one a walk would notice. But
**a traverse has no duration** — *"`go north` is instantaneous and must stay
so"* — and `speed`'s one consumer is the Journey. So on foot, `run` arrives
at the same instant as `walk`, louder, at twice the exertion, worse at
noticing, and may break to a walk winded. Nobody has a reason to run.

The owner: *"if you told me run is all downside, that makes me want to
actually impose some downside on walk that run excludes them from. Time is
the obvious candidate … maybe there's a real argument to be made about
immersion: if you're walking through a room, a one-second-or-less beat
before you can move through the next exit is appropriate … then running
becomes how you mitigate that imposition, which isn't too different from
most RPGs where people just run everywhere — and in our game we can give it
a real metabolic cost."*

⚠ This revisits two standing positions on purpose: the kernel's *no
duration on ordinary movement*, and the owner's own *no imposed net lag*
(2026-11-10, the same conversation). What reconciles them is below.

## ⭐⭐ The beat is derived, not a lag knob **[LEAN]**

The world clock runs at 12× ([time.md](../../subsystems/time.md)). Walking
pace is about 1.4 m/s. So:

| crossing | game time | real time at 12× |
|---|---|---|
| a 4 m cell, walking | ~3 s | ~0.25 s |
| a 15 m hall, walking | ~11 s | ~0.9 s |
| the same hall, running (2×) | ~5 s | ~0.45 s |
| the same hall, sneaking (0.5×) | ~21 s | ~1.8 s |

**"A beat of a second or less" is simply the world clock applied to
walking.** The beat is derived from authored geometry (cell size, the
edge's own length or `edgeMinutes`) × `1/speed` × load — never a delay an
author hand-sets per exit, and never a server-wide knob. It moves with
whatever the pace build decides the clock is.

## ⭐ A cooldown on the next step, not an input delay **[LEAN]**

**Commands queue.** Type `n;n;e;e`, or click a distant room, and the input
is accepted at once; the steps play out on the beat. The command line keeps
its speed of *typing*; the world keeps its pace of *moving*. The map animates
the dot along the way, so the beat reads as motion rather than waiting.

## What `run` buys then

Speed matters against another clock — and with the beat, the first clock
is the walk itself:

- **The beat itself** — run halves it, at twice the metabolic cost (food,
  endurance: [exertion.md](../../subsystems/exertion.md)).
- **Pursuit and flight** — closing or opening distance (combat's ranged
  bands already have it).
- **Races against the world** — the ferry before it casts off, the flood or
  the collapse or the fire spreading room to room.
- **Less time seen** — a guard's window to notice you crossing a lit room
  is shorter at a run; the mirror of sneak's quiet.
- **Delegated travel** — a Journey at run pace arrives sooner and costs
  driver and team more (already wired).

Run wins races, sneak wins attention, walk is the efficient default.

## The lens pass ([design-lenses.md](../../design-lenses.md))

1. **Pedagogy — for.** Speed becomes derivable: room size, pace and load
   give the time. Distance becomes real, which logistics and route-planning
   need before they can teach anything.
2. **Creative expression — for, with a caution.** Authors get distance as
   a tool — a long hall feels long, a cramped warren is quick. The beat
   must come from authored geometry, never a per-exit delay, or *tune the
   lag* becomes a content knob.
3. **Immersion & participation — strongly for.** Movement becomes a place
   things happen: you can be seen crossing a room, a pursuer can gain on
   you. It is what gives run's upside somewhere to exist. Risk: walking
   feels like waiting — the map's moving dot is what keeps the beat alive.
4. **Values — the real argument.** For: honest; the world does not bend for
   the impatient, and run is a fair, priced way out. Against: MUD tradition
   prizes speedwalking, and a player on a slow connection or with motor
   difficulties pays twice. Mitigations: the queue (you never wait to
   *type*), a beat never longer than the world clock says, no beat on
   delegated travel. Accessibility needs its own check — a player who
   cannot run (a wounded leg, low endurance) is slower, and the game should
   say so rather than hide it.
5. **Continuity — the commands survive.** `go north` still means go
   north; only its pacing changes. A player script that assumes instant
   arrival will queue behind the beat — a rule change, not a break.
6. **Economy — for.** Time becomes a cost: run trades metabolism for time,
   giving food and fitness a use outside combat; mounts and vehicles gain a
   reason to exist, and so does the haulage labor market.
7. **Governance — neutral, with one constraint.** The beat is the same for
   everyone at the same pace, load and body — no staff or donor speed-up,
   or it becomes a privilege.

## Open

1. **Combat's clock.** Flight and pursuit need the step beat, but combat
   has its own beat; the two must agree (or one must be the other).
2. **NPCs.** Brains move by the same `traverse`, so they get the same beat
   — fair, and it may change how busy the world looks.
3. **What the queue does on a refusal or a sprung trap** — drop the rest,
   or hold it for the player to resume.
4. **The geometry source.** Cell size for Cartesian zones; `edgeMinutes`
   per edge elsewhere; what a spherical zone or an expanse step is.
5. **Interaction with the pace build** — the beat scales with the clock;
   if pace slows the world, walking slows with it.
6. **Movement as mode + where** (a lean from the same conversation, not
   confirmed): the verb is the how (`walk` · `sneak` · `run` · `crawl` ·
   `swim` · `drive`), the argument the where — a direction for one step, a
   place for many (`run to the Ossuary`); `go` is the same with your default
   mode, and the map's click uses it. The shipped Journey is the delegated
   form. `crawl` would be a fourth pace on the same axis if it should exist.
