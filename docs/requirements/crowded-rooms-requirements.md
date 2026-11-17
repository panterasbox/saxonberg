# Crowded rooms — requirements

**Kind:** refactor/sweep (performance)
**Leads from:** kernel. First consumer: the Terminus square, where the
existing crowd drive puts thirty people. Every realm's busy place
(a festival, a muster, a market morning) is the same consumer.

A place with thirty people in it must answer each of them as fast as an
empty room would. Today it does not: in the controllers-are-io build's
measurements, `say hello` took 375 ms at p95 in a crowd of thirty at best,
against 42 ms in an empty room. The server also froze for over a second at
a time, and logins in a crowd took up to eighteen seconds. The owner,
2026-11-07: *"the game needs to be able to handle crowded rooms; this isn't
just a test-only sort of concern."* The greeting half of that requirement
shipped with controllers-are-io. This build is the timing half. Seeding
slate: [crowded-rooms](../slates/tech-debt/crowded-rooms-slate.md), whose
*Reuse ledger for the plan* the plan must account for.

## What a crowded room is

A crowded room is not a new thing in the world. It is any existing place
when many bodies are in it at once. Nothing a player types changes. What
changes is that every act in that place costs the server the same
whatever the crowd. That covers speaking, arriving, leaving, looking,
logging in and a card on the side panel catching up. The fiction already
says a market square holds a hundred people. The engine has to stop
saying otherwise.

The same rule holds in every epoch: a medieval fair, a train station or a
station concourse is the same crowd. The capability has no epoch.

## What already exists

- **The crowd drive.** `crowd` (blocking) proves the greeting count at
  thirty: each greeter greets an arriving player once, and an NPC walking
  in greets nobody. `crowd` (soak) prints the timing record with generous
  bounds of 1 s p95 and no 500 ms freeze. It runs only after a merge, and
  only when a soak file changed. Today it fails its own bounds.
- **Already done by controllers-are-io:**
  - one light walk per message;
  - a signed-out body leaves the world;
  - the card drain that gives a person's reply priority over the side
    panel. Its cost is that a card can lag about 40 s behind the room in
    a crowd.
- **Card updates** ([card-surface.md](../subsystems/card-surface.md),
  [mql-subscription.md](../subsystems/mql-subscription.md)). A live card
  is a standing query that is re-checked when something it depends on
  changes. Today any body moving re-checks every card in the room. With
  thirty people, each holding cards about the room, every step costs
  thirty times thirty re-checks. And a single re-check at thirty people
  is one uninterrupted freeze of a few hundred milliseconds.
- **NPC background work** ([behavior.md](../subsystems/behavior.md)). An
  empty world spends about 60% of a CPU core on NPC beats. That is under
  every crowd number, and nobody has measured how much of the crowd's
  headroom it eats.
- **Looking at a mould's contents saves the mould** (D27's profiles,
  0.75–1.05 s). Reading what is in it triggers a write.
- ⚠ **In flight: navigation-server (build-2).** Its W1 moves every state
  push, card queries included, onto one subscription protocol. It changes
  how a card's update travels, not when a card is re-checked. The two
  builds touch the same machinery, and the plan must sequence around
  that. Neither waits on the other's merge.
- **The soak lane's clock** (soak-repair, in flight) is the soak
  worktree's, and is out of this build (see Non-goals).

**Therefore what is genuinely new here:**
- a body's move re-checks only the cards that show that body;
- a card nobody can see waits until it is seen;
- no single re-check freezes the server;
- NPC background work costs a fraction of what it does now;
- the timing targets gate the merge, on a quiet machine.

## Goals

- **Thirty people in one place answer like an empty room.** `say` comes
  back in under 250 ms at p95 over 20 commands.
- **Nobody freezes the server.** No event-loop stall over 100 ms in a
  60 s sample while the thirty arrive, speak and leave.
- **Logging in to a crowd is fast.** Login completes in under 2 s at p95
  while thirty are in the square.
- **A card you can see is current.** A card on screen reflects a change
  in the room within 2 s, in the crowd.
- **A card you cannot see costs nothing.** A card that is collapsed,
  scrolled away or behind another does not update. When it is shown
  again it catches up at once: one refresh, within 2 s.
- **An empty world idles cheaply.** With nobody logged in, the default
  world uses under 15% of a CPU core over ten minutes. Today it uses
  about 60%.
- **The room's own reading never writes.** What the room reads for
  everyone in it (the light, the sound and the smell of each thing it
  holds, and a card's view of it) never changes the world. The mould is
  the known case: today it casts its wheel when anyone speaks in the
  room. And a thing's state never depends on who happened to look: a
  mould sets by the clock and its own changes, the same whether anyone
  watched. Any other case on those walks is fixed the same way.
- **We know where the next ceiling is.** The same drive runs at one
  hundred people and records its numbers. They are reported, not gated.
- **The timing is honest.** Every number this build claims comes from a
  run on a quiet machine, with the machine's load recorded beside it.

## Non-goals

- **A room's capacity in bodies.** How many people a room, a lifeboat
  or a lift physically holds, derived from size, goes to
  [room-capacity-slate](../slates/engine/room-capacity-slate.md),
  salvaged from the slate's last question. ⛔ And never as a performance cap: the targets above must
  hold with no limit on who may enter.
- **A clock for the soak lane.** A scheduled `tools/soak` run goes to
  [soak-lane-slate](../slates/tech-debt/soak-lane-slate.md), whose
  worktree is rewriting `tools/soak` now.
- **The 100-person targets.** Recorded here; meeting them is a later
  build, if the record says one is needed. Destination: this slate's
  status block.
- **Concealment's one-second memo.** A change of what you wear can still
  take up to a second to change what others perceive. That is an
  accepted cost and stays as it is. Destination: nowhere, deliberately.
- **Database latency to Atlas.** Destination: the
  [db-performance slate](../slates/tech-debt/db-performance-slate.md).
  This build measures against the local database the drives use.

## Placement

This is kernel work: the engine's card updates, its NPC beat and its read
paths. No pack changes, and no new verb, place or row. A second crowded
place needs nothing. Any place gets this by being a place.

## Collisions

- **The Terminus square and its three greeting NPCs** are where the drive
  runs. The greeting count (each arriving player greeted once, an NPC
  walking in greets nobody) must still hold. It is the shipped half of
  D27.
- **Every NPC with a cadence brain.** Cutting idle cost must not make the
  world feel dead. The idle rates in
  [behavior.md](../subsystems/behavior.md) § ambient idle stay authored
  by content. The build cuts the engine's cost per beat, not content's
  beats.
- **Every live card** (inspect, the navigator, the map, the shelf rows).
  "Seen" is a client fact the server does not have today. This build
  adds it, and it collides with navigation-server's subscription
  protocol, which is where the client tells the server what it holds.
- **The mould** (cheese hoop, ingot mould, ice pan), and anything else
  whose contents are read on a light walk.

## Surface decisions

### Thirty gates; one hundred is reported
Thirty is the crowd that pegged the core, and a festival or market
morning (D27). The drive also runs a hundred and records what happens,
crashes included, without failing the merge. *Owner, 2026-11-17.*

### A card you cannot see pauses, and catches up when seen
Lens 3a decides it: what you can see never lies, and what you cannot see
cannot lie to you. Owner, 2026-11-17. This replaces the accepted cost
recorded in the slate, where a card could lag 40 s behind the room. An
on-screen card is now never more than 2 s behind.

### A move re-checks only the cards that show the mover
The product rule: a card changes when something it shows changes.
Someone walking past a card about a barrel does not touch the barrel's
card. How the engine knows which cards show what is the plan's.

### The empty world's NPC cost is cut, toward 15% of a core
Owner, 2026-11-17: measure and cut it. The target is for the engine's
cost per beat. Content's authored rates are untouched (see Collisions).

### Timing gates the merge, on a quiet machine
The blocking drive asserts the real targets: 250 ms p95, no freeze over
100 ms, 2 s login, 2 s on-screen card, 15% idle. It runs once with every
sibling world stopped, and records the machine's load beside the
numbers. A run on a busy machine is not evidence either way. It is
re-run, never argued from. *Owner, 2026-11-17.* The soak file keeps its
generous bounds as a regression watch after merge.

### The room's reading never writes; nothing depends on who looked
Narrowed at /plan, 2026-11-17. A *deliberate* act may still bring a
thing up to date when it reads it (reconcile-on-read is shipped doctrine
in forty-four places). What may not write is the reading the room does
for everyone: a light walk, sound, smell and a card's projection. Moving
the mould's write onto `look` alone would make its cheese depend on who
looked and when, so the mould banks its progress at its own changes and
completes on the game clock. Lens 3a chose it: the world cannot differ
by who was watching.

## Lens pass

- **1 Pedagogy.** No Discipline. It enables every lesson that needs a
  class in one room: thirty students at the bench is a crowd.
- **2 Creative expression.** The ordinary case needs no code: an author
  who builds a busy square gets a fast one. Nothing to declare.
- **3a Immersion.** This is the build's lens. A world that freezes when
  people gather tells you it is a server. A side panel 40 s behind the
  prose is two worlds disagreeing, and pausing unseen cards removes that.
- **3b Participation.** A crowd is where politics happens: the muster,
  the rally, the market. Today the engine punishes assembly. After this
  build it does not.
- **4 Values.** One choice is undecidable: what the server spends its
  time on when it is short. Decided: the person's own reply first, the
  card you can see second, the card you cannot see never.
- **5 Continuity.** Epoch-free (see *What a crowded room is*).
- **6 Economy.** Nothing produced or consumed. Idle cost is a real
  hosting cost: at 60% of a core per empty world, self-hosting is
  priced out.
- **7 Governance.** Judges no one. ⛔ The one way this build could
  judge a person, refusing entry to a full room for the server's sake,
  is ruled out.

## The drive

On a quiet machine: sibling worlds stopped, and the load average
recorded at the start and end of the run. One world, booted fresh with
the drive's packs. Every step is a `player` assertion through player
verbs, except where marked `staged`.

### Blocking drive

1. **The idle world** (`short`, `staged`). Boot, log nobody in, sample
   CPU for ten minutes of wall time. **See:** under 15% of a core on
   average.
2. **Thirty arrive** (`instant`, `player`). Thirty players log in at the
   avenue block and walk one by one into the square. **See:** every
   login completes in under 2 s at p95; each greeter greets each arrival
   exactly once, and an NPC walking in greets nobody.
3. **One person speaks** (`instant`, `player`). One of the thirty says
   `hello` twenty times. **See:** p95 under 250 ms.
4. **Everyone in turn, then all at once** (`instant`, `player`). Each of
   the thirty says `hello`, first in turn and then together. **See:** in
   turn, p95 under 250 ms; all at once, everyone hears everyone, and the
   last line arrives within the record's bound.
5. **No freeze** (`instant`, `staged`). `/healthz` is sampled throughout
   steps 2–4 and 6–8. **See:** no sample over 100 ms.
6. **A card you can see** (`instant`, `player`). One player has an
   inspect card on the square open and on screen, and another player
   walks in. **See:** the card shows the arrival within 2 s.
7. **A card you cannot see** (`instant`, `player`). The same player
   collapses the card, five players walk in and out, then the card is
   shown again. **See:** the card shows the room as it is now within
   2 s. Nothing reached that player's client for the card while it was
   collapsed.
8. **A mould in the crowd** (`instant`, `player`). A cheese mould with
   curd in it sits in the square. Ten of the thirty `look` at it and
   `look in` it. **See:** each answers in empty-room time, and no freeze
   is recorded.
9. **Thirty leave** (`instant`, `player`). Each walks out and quits.
   **See:** no freeze; the square is empty of bodies.
10. **A restart** (`short`, `staged`). Restart the world and log the
    thirty back in where they quit. **See:** logins under 2 s at p95,
    and every player stands where they quit.
11. **One hundred** (`instant`, `player`, **reported, not gated**). Steps
    2–4 with one hundred players. **See:** the record printed beside the
    thirty's: each phase's p50/p95, the worst freeze and the box load. A
    crash or a timed-out login is recorded as the finding.

### Soak drive

No span steps: nothing here depends on game time. The existing crowd
soak file stays as the post-merge regression watch, with its generous
bounds.

## Acceptance criteria

- With thirty people in the Terminus square, on a quiet machine:
  - `say hello` comes back in under 250 ms at p95;
  - no server freeze over 100 ms across the arrival, the talk and the
    leaving;
  - login takes under 2 s at p95.
- A card on screen shows a change in its room within 2 s, in that crowd.
- A collapsed or hidden card receives nothing while hidden, and shows
  the current room within 2 s of being shown.
- With nobody logged in, the default world averages under 15% of a CPU
  core over ten minutes.
- Looking at, and into, a mould in the crowd answers in empty-room time.
  Nothing the room reads for everyone writes, and a mould left alone sets on time whether or not anyone looks.
- Each arriving player is still greeted once by each greeter, and an NPC
  walking in still greets nobody.
- After a restart, thirty players log back in under 2 s at p95 and stand
  where they quit.
- The one-hundred-person record exists, with the box's load beside it,
  in the plan's drive record and the slate's status block.

## Cross-references

- Seeding slate: [crowded-rooms](../slates/tech-debt/crowded-rooms-slate.md)
- [card-surface.md](../subsystems/card-surface.md) ·
  [mql-subscription.md](../subsystems/mql-subscription.md) ·
  [behavior.md](../subsystems/behavior.md) ·
  [messaging.md](../subsystems/messaging.md) ·
  [connection.md](../subsystems/connection.md) ·
  [mould.md](../subsystems/mould.md)
- In flight: navigation-server (build-2): one subscription protocol,
  W1
- [soak-lane-slate](../slates/tech-debt/soak-lane-slate.md) (the
  lane's clock) · [db-performance-slate](../slates/tech-debt/db-performance-slate.md)
