# Pace slate — whose attention a duration must fit

> **Status: UNBUILT** — designed at high level 2026-10-28/29 with the owner. What ships: the world
> clock at 12×, runtime scale with re-anchoring and no discontinuity, every stored timestamp in game
> seconds ([time.md](../../subsystems/time.md)); metabolism per game-minute and frozen offline
> ([metabolism.md](../../subsystems/metabolism.md)); the dying record ticking on the world clock
> ([mortality.md](../../subsystems/mortality.md)); combat's beat and the killing stroke in game time
> ([combat.md](../../subsystems/combat.md)); brain cadences, standing decay and dormancy in real time;
> husbandry's neglect thresholds stated in real days.
> **Left:** the pace ruling (encounter · session · absence · calendar) · the coupling rule
> (timescale separation) · the player-facing sentence and `help time` · durations told as states ·
> *day* means the world's day · the census of timed constants and a gate that makes each declare its
> pace · the dying windows, the killing stroke and the combat beat moved to encounter pace ·
> metabolism to played real time · pets to absence pace · aging · attended work
> **Size:** a build

## 0. The ask **[DECIDED — the owner]**

*"I wanna explore the idea of slowing the clock down. Right now it runs at 12×, which is fast, but
also standard for a lot of games. I worry about some of the biological processes, though, how they
feel running at this rate. There's also the possibility of just fudging individual processes where
we need to for game design's sake, even if the math isn't completely honest. When we start
introducing things like eating and brushing teeth or feeding/walking pets, I dunno, it's a lot. …
If we go with 6× or 12× or whatever at launch, how big of a deal would it be for the Compact to
rethink it later?"*

And: *"I would kind of want to try to come up with a broader rule we could apply. This game is all
about rules, because if we don't do this, then the legislature will, and it has to hand down rulings
in text as product requirements that can be implemented."*

## 1. ⚠⚠ The finding — the dying windows are game seconds

The dying record ticks on the world clock. mortality.md's *"90 s · 120 s · 300 s · 600 s"* are
**game** seconds, so at 12× the real windows are:

| cause | stated | real at 12× |
|---|---|---|
| vital organ lost | 30 s | 2.5 s |
| asphyxiation, electrocution | 90 s | 7.5 s |
| exsanguination | 120 s | 10 s |
| hypo/hyperthermia | 300 s | 25 s |
| starvation, dehydration, toxin | 600 s | 50 s |

A bleed-out leaves time for about one typed command. The 2026-10-28 emergency designs
([emergency-services](./emergency-services-slate.md), [field-medicine](./field-medicine-slate.md))
assumed the stated figures as real time; both now point here.

## 2. How locked in the scale is **[LEAN]**

**The dial is not locked** — scale is runtime state and `setScale` re-anchors. **What locks it is
what was authored against it:**

| what | runs on | a later scale change |
|---|---|---|
| the world's calendar — day, seasons, crops, ripening, aging | game time | ✅ what the scale is for |
| bodies in the moment — bleeding, dying, combat, exertion, recovery | game time | ⚠ feel changes by accident (metabolism.md already warns) |
| real-time rules — cadences, standing decay, dormancy, sentences | real time | unaffected; the relationship shifts |
| ⭐ the economy — wages per shift, rent per game day | game time | ⚠⚠ a monetary shock — income per real hour moves with the scale |
| content written against the scale | mixed | each one rescales or reads wrong |

## 3. Why not "two clocks" **[DECIDED — the owner's skepticism, upheld]**

A clean world/body split fails five ways: a rate that depends on *being watched* makes the world
underivable; attended work (boiling, smelting, the sugar pan) is playable *because* it is compressed;
coupled physics needs one time variable; a body's meals and sleep would drift from the world's
mealtimes and shifts; and there are already three clocks (world, real, played) whose seams are where
the bugs live.

## 4. ⭐⭐⭐ The pace ruling **[DECIDED — the owner: "this sounds alright", legibility required]**

Every duration declares **whose attention it must fit**:

| pace | fits | measured in | examples |
|---|---|---|---|
| **encounter** | a person present, reading and typing | real seconds, **counted in actions** | combat's beat, the killing stroke, the dying window, drowning, rescue |
| **session** | the player, while playing | **played** time (stops offline) | hunger, thirst, fatigue, recovery, personal chores |
| **absence** | the player, between sessions | real days | pets, plants, a shop's stock |
| **calendar** | the world | game time at the scale | day and night, seasons, crops, ripening, aging |

- **Encounter pace is the medium test.** In a text game the irreducible unit is reading a line and
  typing a command — a few seconds — so a window is *"time for about four acts"*. That is why combat
  already has its own rhythm, and what is wrong with a ten-second bleed-out.
- **Session against absence is the split the body already makes** — your body stops when you log
  off; your dependents do not. Personal needs recur at most about once a session; dependents survive
  an ordinary absence with ordinary provision and lapse only after real neglect.

### The coupling rule — timescale separation **[LEAN]**

> **A faster process reads slower ones as fixed while it runs; a slower process sees only a faster
> one's results.**

The standard physical approximation, so it stays derivable: a bleeding body in a snowstorm bleeds
out in encounter time reading the night's cold as a fixed input, and the calendar sees only *died* or
*stabilized*.

### The ruling, as a legislature would write it **[LEAN — the wording]**

> **On the pace of things.** Every process that takes time declares whose attention it must fit, and
> is timed accordingly. (1) *Encounter* — what a person present must answer is measured in real
> seconds and sized to the acts they can take; no window shall be shorter than the act that answers
> it. (2) *Session* — what a body asks of the one playing it is measured in played time and recurs no
> more often than about once a session. (3) *Absence* — what lives on while its keeper is away is
> measured in real days; it survives an ordinary absence with ordinary provision and fails only after
> real neglect. (4) *Calendar* — the world's days, seasons and growth run on the world clock; **the
> scale is the polity's to set, for daylight and seasons, and changing it changes the calendar pace
> alone.** A faster process reads slower ones as fixed while it runs; a slower process sees only a
> faster one's results.

## 5. ⭐⭐⭐ Legibility — what a player sees **[DECIDED — the owner: legible to players; the rules LEAN]**

The owner: *"I would want this to be all very legible to the players. A constant 12× clock is very
easy to understand. This four-row matrix is not bad, it's just more to process."*

**Players see two clocks, not four** — encounter, session and absence are all *your* time:

> **The world turns twelve times faster than you do. The sun, the seasons and the crops run fast;
> you, your fights and the creatures who depend on you keep your time.**

The 12× clock stays the one constant players know. The rest is experienced, not explained:

1. **Durations are told as states, not numbers** — *going fast*, *hungry*, *pining*, *nearly ripe*;
   bands, never gauges, as the game already does.
2. **"Day" means the world's day** — in-world prose says *day* only for the 12× day; anything on your
   time is told by state or by visits (*"a dog wants you most times you visit; leave a full bowl if
   you'll be away"*), never by a count of days.

The four-row matrix lives in the rulebook — the ruling, the authors' requirement, the gate — and in
`help time`, which opens with the one sentence.

## 6. What the build does **[LEAN]**

1. **A census of timed constants**, then a gate: every duration declares its pace, and an untagged
   one is refused — census, then ratchet.
2. **Encounter pace** — the dying windows, the killing stroke and combat's beat authored in real
   seconds and read through the scale.
3. **Session pace** — metabolism in played real time (it is effectively there).
4. **Absence pace** — pets' feeding ladder; husbandry's thresholds are already stated in real days.
5. **`help time`** and the prose audit for *day*.

## 7. Open

1. ⚠ **What the dying windows should be in real time** — the stated figures read as real seconds
   (90 s to 10 min) match the emergency designs.
2. ✅ **Aging — answered 2026-10-29**: players do not age (an adult age band, [lineage-slate](./lineage-slate.md));
   lifespans are paced to be witnessed, pets on the calendar
   ([stage-and-simulation-slate](./stage-and-simulation-slate.md) § 4).
3. ⚠ **Attended work** — boiling, smelting and the sugar pan are physics, so calendar pace; they fit a
   session only because of 12×, so a scale change makes authors recheck them. Accept the leak, or a
   pace of its own?
4. **The economy** — price wages and rent per real hour, so the money supply does not move with the
   calendar?
