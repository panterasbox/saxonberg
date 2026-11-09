# Boundary — requirements

**Kind:** refactor/sweep
**Leads from:** kernel. **First consumer:** the zone navigation card's compass rose
([map-slate](../slates/builds/map-slate.md) Wave 1, the next client build), which needs one honest answer
per way: open, shut, locked, a window. In this build the consumers are what already reads a way —
`look`, `open`/`close`/`lock`/`unlock`, `go`, the light walk, the navigator.

Every way between two places — a door, a gate, a gangway, a window into the next room — becomes **one
object shared by both places**, and each place's **side** of it is the exit. Today the same fact (*this way
is locked*) is answered four different ways (a door hung on an exit, per-side anchor fixtures, five exit
classes that carry their own private locks, and separately wired windows), and the screens that show a way
know only some of them: nothing a player sees today says a keyed door is locked. Seeded by
[boundary-slate](../slates/builds/boundary-slate.md) (the model, the four models of today, the target shape);
the reuse ledger is that slate's § 6.

## What already exists

- **Ways today.** 8 authored doors, all a door hung on an exit (the bank's pump house, the rubber works'
  glass door and stove-house vent, the campus gate at the University Avenue crossing, Duncan Hall's front
  doors, the Rejection foundry's yard door, the Delight brickfield's shed and shop doors). 3 windows (the
  Rejection hut's west and south, and the generic fixture). Locked ways that are **exits with their own lock**
  and no door: the dorm doors, the Seznick House front doors, the farmstead and Hinkley yard doors, the lot
  gates, and the ship's gangway — read by the berth on shore and the deck's `ashore`, two exits agreeing on
  one lock by convention. One door kept by an attendant (the counting-house parlor arch), one vessel with a
  door of its own (the coach).
- **Gates, hatches, gratings, trapdoors** exist only as scenery words (the crossing's gate detail, the
  creamery's "trap, steps, hatch", the cheese room's grating). No curtain, portcullis or ice hole anywhere.
- **Verbs:** `open` · `close` · `lock` · `unlock`; `go` and the movement modes; `look` (and `look north`,
  which already describes the way from here, never where it leads — !511), `listen`, `smell`, `search`.
  No `knock`, no lockpicking.
- **What a player is shown:** the room card's exit chips (direction only), the phone's button bar
  (direction only), the navigator (direction, whether it crosses a zone, a door's name and whether it is
  open), and `look`'s "obvious exits" line. **No surface shows a lock**, and none knows a keyed exit or a
  window.
- **Zone rules a way already obeys:** inside a zone, rooms are cells of one size and ways between them are
  cardinal (north, south, the diagonals, up, down); a freely named way (`office`, `out`) is allowed only into
  another zone. Crossing a zone is the larger change a player is told about (the navigator marks it).
- **Enclosure:** a place's walls and roof (`construction.md`) already let sky light and the sun's heat
  through glass by the thickness of the pane — so a window with sky behind it needs nothing new.
- **In flight:** build-2 (controller liquidity) has rewritten locking — `lock`/`unlock` answer who acted
  and why not (already locked, no key) — and the gangway pair's lock; its later waves change `open` and how
  a command finds its target. **This build lands after it** and keeps its locking contract.

**Therefore what is genuinely new here is** the one shared edge with its sides, the folding of the four
models into it, the zone invariants stated for an edge rather than an exit, and one shape that tells every
screen the whole state of a way.

## Goals

- **One way, one object.** A door, gate, gangway or window between two places is one thing; both places'
  sides see the same material, words, open/shut state and lock. Lock it from one side and it is locked from
  the other.
- **The side is the exit.** `look door`, `look north`, `open door`, `go north` all find the same side; the
  side describes its boundary as seen from here (*the oak door is closed*).
- **What a way lets through is the boundary's**, channel by channel — movement, light, sight, sound, smell,
  water. A window into the next room passes light and sight and never movement; a curtain passes movement
  and blocks sight; a shut door passes a little light at its edges and a little sound.
- **Every screen tells the whole state of a way** — open, shut, locked, a window, a threshold into another
  zone — the same way: the navigator, `look`'s exits line, the room card's chips. A keyed door's lock is
  shown like any door's.
- **The zone rules hold for an edge.** Inside a zone a boundary joins two **adjacent** cells through their
  shared face: its sides are **opposite** directions by construction, and its opening never exceeds the
  face. Across zones a boundary is a **threshold**: its sides are named freely, its opening comes from its
  kind or is authored, and crossing it is shown as a zone change.
- **A window with sky behind it is glass in the wall**, not a boundary: an author writes it on the place's
  enclosure and the room is lit and warmed through it with no other place involved.
- **An author makes a new kind of way with a row**, no code: a gate, a hatch, a grating, a curtain is a
  boundary row with its material and what it passes.
- **Nothing a player can do today stops working** — every locked way stays locked to the same keys, every
  door opens and shuts as before, the gangway still follows the ship's lock.

## Non-goals

- **Turning today's scenery gates, hatches and gratings into real ways** → each locality's content, any
  time after this build, as rows with no code (the crossing's gate, the creamery's hatch are the obvious
  first ones).
- **The compass rose, the interzone list and the navigation card itself** → [map-slate](../slates/builds/map-slate.md)
  Wave 1, the next client build. This build makes the state available; the card draws it.
- **Lockcraft — a locksmith, master keys, key-holder records, picking** → [lock-slate](../slates/builds/lock-slate.md).
- **Per-channel tables by material and construction** (how much a steel door muffles against an oak one)
  → [senses-slate](../slates/builds/senses-slate.md). This build carries the channels; their numbers stay
  what they are today.
- **Exit clearances and squeezing through** → the size-and-carrying build (its requirements are on master);
  this build supplies the opening it reads (the face inside a zone, the kind's or authored size at a
  threshold).
- **Knocking, peering, barring** → nowhere, deliberately; no verb is added.
- **Blocking a way with a body** → [collision-slate](../slates/tails/collision-slate.md).

## Placement

Kernel: the boundary, the side, the zone invariants and the one shape a screen reads — every way in every
pack uses them. Packs own their rows: residence (the dorm, front, yard and lot-gate ways), eternal-university,
transport (the ship's gangway, the coach), terminus, rejection, hearts-delight. **The test** — does a new
kind of way need code? No: a boundary row with its material and channels. A new place with a door needs one
`door:` on its exits, as today.

## Collisions

- **build-2, controller liquidity** — the same lock and gangway code. This build lands after it and keeps
  `lock`/`unlock`'s answer (who acted, why not).
- **The residence pack's holdings** — the dorm doors, Seznick House front doors and lot gates are made by
  code when a holding is stood up, keyed to the holding's keyway; their locks become the boundary's, keyed
  the same way. A tenant's key opens what it opened.
- **The ship** — her gangway becomes one boundary that the berth on shore and her deck share.
- **The counting-house parlor arch** — the attendant's veto stays a thing a side does.
- **The coach** — its `out` becomes a side like any other.
- **The Rejection hut** — its two windows become sides of real ways onto the yard.
- **The light walk** — what lights a room through an open door, and the sight a peek gives, read the side's
  boundary instead of fixtures. Rooms must stay as lit as they are.
- **The live demo world and every dev database** — rebuilt from the packs (no migration; dev databases are
  dropped).

## Surface decisions

### A window with nothing behind it is enclosure; a window with a place behind it is a boundary

**Lens 2 chose.** The ordinary case (a lit room with a view) needs nothing new — the enclosure's glass
already admits sky light and the sun's heat — and the bespoke case (seeing into the next room) is one
boundary with sight and light and no movement. The view out is prose.

### Interzone is derived, and every channel keeps today's one-hop rule

Whether a boundary crosses a zone is a fact about the two places it joins. Moving across it, and looking or
listening through it on purpose, work across a zone line (one hop, on use — a zone is an engineering
partition, and the fiction must not show it: lens 3a). The **ambient** flows — light filling a room, heat
between rooms, sound and smell spreading — stay one hop and never chain onward, so a zone line stops them
exactly as it does today.

### The zone invariants are stated for the edge

Inside a zone: adjacent cells only, opposite sides, an opening no larger than the shared face. Across zones:
a threshold with free names and an opening from its kind or authored. One boundary makes the opposite-side
rule structural — two exits authored separately can disagree today; one edge cannot.

### A curtain is a boundary

It passes movement and blocks sight — the model's channels say exactly that. **Lens 1 chose**: one rule
(what each channel passes) explains a door, a window, a curtain and a grating without a special case.

### A way with nothing in it has no boundary

An open archway or a lane's end is a side with no boundary; it passes everything. Only a way with
something in it — something you can shut, see through, or lock — has one.

### Locks belong to the boundary, keys to whoever holds them

A holding's keyway keys its door's boundary; the ship's gangway lock is her gangway boundary's. Nothing about
who holds which key changes.

## Lens pass

**1 pedagogy.** One object and one rule per channel: a learner sees why a window lets light and not a body,
why a curtain is the opposite, why a locked door is locked from both sides. The zone rules teach the map's
grammar — cells, faces, opposite directions, and the threshold where the scale changes.

**2 creative expression.** A new kind of way is a row; a room with a window is a word on its enclosure; a
threshold between two zones is a named way, as now. Nothing an author writes today needs to change shape
except where a door is hung (one `door:` stays one `door:`).

**3a immersion · 3b participation.** The fiction stops contradicting itself: no door that is locked from
one side and open from the other, no screen that shows a keyed door as plain. 3b: unaffected — the polity
gains no new power over ways (locks and keys are the lock slate's).

**4 values.** None at stake.

**5 continuity.** The strongest case: a curtain, an oak door, an iron gate, a hatch and an airlock are one
object with different materials and channels, so every era's way answers the same commands.

**6 economy.** Produces and consumes nothing now. It is the seam the lock slate's locksmith, the glass
trade's panes and the size build's clearances all read.

**7 governance.** Judges no person. The attendant's veto at a side is unchanged.

## The drive

Kernel-led, so it drives the existing ways. Every step is `instant` or `short`; nothing depends on the
clock, so **there is no soak drive**. Wizard staging is marked.

### Blocking drive

1. `instant` `player` — At the bank, `look pump-house door`, then `look` at the way from each side: the same
   door, closed and locked, described from where you stand. `open` it: refused, locked, from either side.
2. `instant` `staged` — Give the driver a key to it; `unlock`, `open`, walk through, `close`, `lock` from the
   far side; walk back round: it is locked from the near side too.
3. `instant` `player` — In a dorm room and at a Seznick House front door (made by code for a holding), the
   tenant's key opens it and a stranger's does not; `look` and the navigator show the door **locked** before
   it is unlocked.
4. `short` `staged` — A ship at her berth: lock the gangway from the deck; from the shore it is locked; unlock
   from the shore; from the deck it is open.
5. `instant` `player` — At the Rejection hut, `look west` through the window: you see the yard; `go west`:
   refused — it passes no body. From the yard, the hut's window shows the room inside.
6. `instant` `player` — `look door`, `look north`, `open door`, `go north` at Duncan Hall's front doors all
   find the one way; `look north` describes it from here, never where it leads.
7. `instant` `player` — Every screen agrees: the navigator, `look`'s exits line and the room card's chips
   show the same open / shut / locked state for the same way, and mark a way that crosses into another zone.
8. `short` `player` — At night, an open door lights the dim room beside a lit one as before; shut it, and the
   dim room darkens; a window into a lit room lets its light through.
9. `instant` `staged` — The parlor arch: the attendant still turns away who he turned away before. The
   coach: board it, `go out`, as before.
10. `instant` `staged` — As an author, add a curtain between two rooms of one zone, as a row with no code:
    you can walk through it and cannot see past it. Try to add a way between two cells of one zone that are
    not adjacent, or whose sides are not opposite: refused, with the reason.
11. `short` `staged` — Restart the world; repeat steps 1, 3 and 4: every lock, every open or shut state, and
    the gangway read back the same.

### Soak drive

None.

## Acceptance criteria

- A way between two places is one thing: its state, words and lock are the same from both sides.
- Every way a player meets today opens, shuts, locks and lets light through as before, to the same keys.
- Every screen that shows a way shows whether it is open, shut or locked, a window, or a threshold into
  another zone — keyed ways included.
- A window into a place passes sight and light and never a body; a window to the sky is the room's
  enclosure.
- Inside a zone, a way joins adjacent cells with opposite sides and fits its face; across zones it is a
  threshold shown as such; an authored way that breaks either is refused with the reason.
- An ambient flow never chains across a zone through a boundary; moving and looking through one do.
- An author adds a new kind of way with one row and no code.
- A world built fresh from the packs runs the drive above end to end, and again after a restart.

## Cross-references

- [boundary-slate](../slates/builds/boundary-slate.md) — the model, the four models, the target, § 6 the reuse ledger
- [map-slate](../slates/builds/map-slate.md) — the first consumer (Wave 1: the rose, the interzone list)
- [lock-slate](../slates/builds/lock-slate.md) · [senses-slate](../slates/builds/senses-slate.md) ·
  [collision-slate](../slates/tails/collision-slate.md) · [size-and-carrying-requirements](./size-and-carrying-requirements.md)
- Subsystems: [boundary.md](../subsystems/boundary.md) · [location.md](../subsystems/location.md) ·
  [zone.md](../subsystems/zone.md) · [construction.md](../subsystems/construction.md) ·
  [light.md](../subsystems/light.md) · [location-graph.md](../subsystems/location-graph.md)
- In flight: build-2 [controller-liquidity](../requirements/controller-liquidity-requirements.md) (on its branch)
