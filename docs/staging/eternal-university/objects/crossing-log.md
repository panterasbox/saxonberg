# Object — Gus's crossing-log (staging)

> **Status:** staging draft (full object spec).
> **Belongs to:** Gus, the crossing guard (the EU campus-gate stop).
> **Target seed paths:**
> - `CrossingLog` class (thin `Thing` subclass) → `mud/obj/`.
> - Gus's specific log (the *instance*) → a seed under
>   `mud/seeds/obj/.../crossing-log.yaml`.
> - The **`tally`** verb → carried by the log (object-carried command, like
>   the watch carries `wind`/`set`) → `mud/cmd/tally.yaml` +
>   `mud/obj/command/TallyController.ts`.
> **Depends on:** the **`Timekeeping`** capability + `Watch`
> (`objects/pocket-watch.md`), the **`WorldClockApi`** (upstream, via the
> watch), Gus's **npc-behavior** (he perceives crossings), and the
> **scope-modality slate** (`docs/slates/tails/scope-modality-slate.md` — `tally`
> reads a timepiece over *sight* scope).
> **Retire when:** the `CrossingLog` class, the `tally` verb, and Gus's seed
> are cemented. Then delete.
>
> The last of Gus's props, and the one that pairs with his **no-memory**
> rather than the won't-do quartet (sit/set/open/cross). It's the record of
> *everyone*, kept by the man who remembers *no one*.

A worn **clipboard** hanging at the post, where Gus tallies every soul he
walks across. Per real-or-nothing it must *actually* tally — a static "pages
of marks" that doesn't really count would be a fake of the very thing that
defines him.

---

## The headline: the log is passive; Gus is the agent

The earlier draft had the log **subscribe to a crossing event and write
itself** — a magic logbook. That's wrong, diegetically and architecturally.
The fix:

- **The log subscribes to nothing.** It's a dumb clipboard: it holds a list
  of marks and accepts a new one when someone writes to it.
- **Gus** is the one who watches for crossers (his entire job) and **marks
  the log by hand** — via his **npc-behavior**, the same perception that
  fires his greeting. He's an Agent reacting to what happens in his room,
  which is exactly what that behavior is *for*.
- **No Gus, no mark.** If he's ever away, asleep, or gone, the crossing
  still happens but goes **unwitnessed and unrecorded.** It's one man's
  handwritten tally, **not a turnstile counter.** The only record of
  everyone who passed exists *solely because he keeps it.*

This is better three ways: no content-hook on a substrate object (a
clipboard doesn't reach into the world); the watch-time falls out naturally
(he marks by *glancing at his watch and writing what it says*); and the log
is exactly as reliable as Gus himself.

---

## Form

- A thin **`CrossingLog` class** (extends `Thing`). Bespoke, not a
  generalized "Ledger substrate" — one object with novel behavior; a thin
  class is its honest home. (If turnstiles/attendance-logs ever want it,
  generalize *then*.)
- Composes **`Visible`** — the look.
- Composes **`Tangible`** — hardboard + a metal clip + paper.
- Composes **`Detailed`** — the **page** (the marks) and the **clip**.
- **Hangs at the post** (not wielded) — his hands are full of paddle. (Minor
  dial; could be wielded.)
- **Carries the `tally` verb** (object-carried; no new mixin grants it).

---

## The data model — `when`, never `who`

A persistent list of **marks**. Each mark is a single **timestamp** (a
timepiece reading) **or null** (an untimed tick). **No identity, ever.**

The no-identity isn't worked around — it **is** the implementation. When
Gus marks the log, the crosser's identity is *available* and the log
**deliberately discards it**, keeping only the time. This must be loud in
the spec so no future dev "improves" it by storing a player id and quietly
kills the whole point. He records **when**, never **who**.

(Growth: the list grows for the life of the world — that's the point, it's
the permanent record. At demo scale a list of numbers is cheap; if it ever
matters, window the *displayed* tail while keeping the full count. Don't cap
silently.)

---

## What counts — inbound crossing events *(geometry updated 2026-07-12)*

The log marks one tick per **inbound crossing** — someone arriving from the
terminal into Gus's room. **Gus guards the crossing both ways, but tallies
inbound only** — the log is his record of the souls he's seen *in*, not a
traffic counter, and inbound rhymes with his arrival-fed contentment.

Precisely, under the current geometry (the terminal is its own branch `east`
across the street; the campus gate is `west`, locked; see
`../arrival-quad.md`):
- **The TPA never marks** — teleport is magic, *and* it happens off-stage in
  the terminal (a different room); Gus never even witnesses it. Doubly not a
  crossing.
- **`east`-in (terminal → Gus's room, on foot) always marks** — this is the
  crossing he witnesses and walks you across. Every time, including re-entries.
- **`east`-out (leaving to the terminal) never marks** — a departure isn't an
  arrival. He sees you off; he doesn't tally it.
- **`west` (the campus gate) is locked** — no one crosses it yet; when campus
  lands it becomes a *second* inbound mark.

It counts **crossing *events*, not people.** Cross in, out, in = **two**
marks for one soul — **no memory**, so each inward crossing is a fresh
arrival. (He'll give the full walk-across ceremony to someone stepping back
in thirty seconds later, with no idea — the geometry makes the no-memory bit
*funny*, not just sad.)

**The mark is a deed, decoupled from the ritual.** Gus tallies on the
*witnessed arrival*, not on his performance finishing — so an aborted ritual
(a beeliner) still marks, and in the busy-hub case where he *batches* the
greeting for a crowd, **each arrival still tallies individually**. The count
stays honest even when the theater collapses. (See `../npcs/crossing-guard.md`
*The movements* + *the busy-hub case*.)

**The third inaccuracy.** This makes the ledger wrong in *three* ways, all
from the one root — no memory:
- **wrong times** (the drifting, never-set watch),
- **no names** (he can't record *who*),
- **inflated counts** (re-entries he can't dedupe).

He believes it's "every soul I've sent across." It's really "every time the
gate was crossed inward." He will never know the difference — same as he'll
never know the time is off or the names are blank. Three honest
inaccuracies, one cause.

---

## The `tally` verb — observe, never manipulate

`tally <log>` lets an actor add a mark. What it does:

1. **Find a readable timepiece** in the actor's **sight** scope — the
   `Timekeeping` thing whose face the actor can *see* (via the
   scope-modality model: carried/worn watch with its lid open, a wall clock
   across a lit room, even a watch in a *clear* case). Detected with
   `MixinApi.hasMixin(x, Timekeeping)`, read via `currentReading()`.
2. **Stamp the mark** with that reading — or, if there's **no readable
   timepiece** (none present, lid shut, room dark, sundial at night →
   `currentReading()` returns null), write a **bare untimed tick.**
3. **Discard identity.** Append the mark; never store who.

**Observe, never manipulate.** `currentReading()` is a *read* (observation);
`open`/`wind`/`set` are *writes*. `tally` only observes a timepiece's
current visible state — it does **not** reach over and operate your gear.
So a watch with its **lid shut reads as null** (the dial isn't visible), and
the actor must `open` it first as a **separate, deliberate act** (springing
a hunter case is a distinct motion, not part of glancing-and-writing). This
is the same agency line as the log itself: the actor manages their own gear;
the verb never decides for them.

## Timepiece resolution — the v1 fallback *(added 2026-07-12)*

Step 1 above ("find a readable timepiece in the actor's **sight** scope")
depends on the **scope-modality slate** (sight scope + transparent
containers), which is **unbuilt.** So the shipping v1 narrows it to a strict
subset that needs no new engine:

- **v1 `resolveReadableTimepiece(actor)`** — scan the actor's **own
  carried/worn** items for `MixinApi.hasMixin(x, Timekeeping)`, return the
  first whose `currentReading()` is non-null. Your own watch is trivially in
  your own sight scope, so this is a *subset* of the eventual model, not a
  hack. Gus reads his own vest-chain watch; done.
- **v2** — swap in the sight-scope resolver when scope-modality lands (wall
  clocks across a lit room, clear cases, darkness → null). **Same call site,**
  wider search. (The clock tower's cross-street read is the same v2 frontier —
  `clock-tower.md` sidesteps it for now with an authored dynamic detail.)

`resolveReadableTimepiece` **folds into the `tally` controller** (or a small
`Timekeeping`-side Api static) — not a free-floating helper.

**The log stays innocent — three inaccuracies, all from outside it.** The log
records whatever `currentReading()` returned; it neither knows nor applies
drift. So **wrong times** live in the *watch's* `rate`; **no names** is the
*log's own deliberate discard*; **inflated counts** are *Gus's no-memory*
(re-entries). The log's accuracy is always exactly the marker's accuracy.

**Edge matrix:**

| Situation | `currentReading()` | mark |
|---|---|---|
| Gus, lid open, wound (normal) | drifted time | timed (wrong, consistent) |
| Gus, lid shut (didn't bother) | `null` | untimed tick |
| watch unwound/stopped (not Gus) | frozen time (if lid open) | that frozen time |
| actor has no timepiece | — | untimed tick |
| synced/accurate timepiece (the tower's class) | true time | true time |

---

## Why the times are wrong (the watch-time fiction)

Gus's only instrument is his drifting, slow, **never-set** watch. He marks
the log by reading *it*. So **every mark inherits the watch's error** —
every "3:47" in the ledger is 3:47-*by-Gus's-slow-watch*, a little wrong,
consistently wrong, as unreliable as the man keeping it.

Two clock-objects, coupled and mirror-imaged: the **watch** consumes the
world-clock and *corrupts* it into Gus-time; the **log** consumes Gus-time
and makes it *permanent*. The error launders through the watch into the
eternal record. The man whose own sense of time has slipped is the keeper of
the world's exact record of everyone — and remembers none of them.

And because `tally` reads *the actor's* timepiece, the fiction generalizes
for free: a player with an accurate (synced) timepiece writes true times; a
player with a cheap drifting one writes wrong ones; a player with a shut
watch or none writes untimed ticks. The log's accuracy is the marker's
accuracy. (See `pocket-watch.md` for why "accurate watch" means a *different
class* under `Timekeeping`, not a field-variant of the drift `Watch`.)

---

## Gus's tally ritual

He perceives the crossing (npc-behavior), performs his paced crossing ritual
("hold it right there — both ways — c'mon across"), and **as he walks you
across**, he marks the log:

> flips open the hunter case · glances · makes his tick · snaps it shut

That lid-flip isn't overhead — it's the **fussy ceremony**, of a piece with
checking both ways down an empty street. And if he ever *doesn't* bother to
open it — tired, distracted, end of a long day — the log just gets a **bare
untimed tick**, its own quiet tell.

(Marking is his deliberate act, not the verb's magic. He uses the real
`tally` verb on the bus — no NPC method-backdoor — the same verb a player
with a tally sheet could use.)

---

## Reading it

`look log` → the overridden `getLong()` shows a **total count** ("1,247
souls seen across") + the **recent tail** with timestamps (in Gus-time). No
verb needed; no query system. The beat — *find your own crossing by when* —
works for free because your mark is **fresh**: you just crossed, so your
tick is right at the bottom of the tail, identical to every other, *exactly
as anonymous as you were to him.* (Deeper date-scrubbing could come later;
the fresh tail delivers the whole ache without it.)

---

## What this object surfaces (build list)

- **The `CrossingLog` class** + Gus's seed instance.
- **The `tally` verb** (object-carried; sight-scoped timepiece read +
  discard-identity append).
- **The crossing event Gus perceives** — his npc-behavior subscribes to the
  stop↔gate traversal (the same hook that fires his greeting). Exact seam
  (traversal-of-exit vs entry-to-room) pinned at build; the containment
  event substrate exists.
- *(consumes, documented elsewhere)* the **`Timekeeping` capability** +
  `Watch` (`pocket-watch.md`); the **scope-modality slate** (sight scope +
  transparent containers); **`WorldClockApi`** (upstream via the watch);
  **npc-behavior** (Gus's perception + paced ritual; degrades to a static
  log for the demo).

Reuses, shipped: `Thing`, `Visible`, `Tangible`, `Detailed`, the global
`look`, and the carried-command mechanism the watch/instruments establish.

---

## What degrades for the demo

- **Exists, hangs at the post, `look`-able with a starting count** — today.
- **Live tallying** needs Gus's npc-behavior (to perceive crossings) + the
  `tally` verb + `Timekeeping`/`Watch`. Until then: a static log with a
  seeded count, no live marks. The full living-ledger lands when those do —
  and this doc is the spec that tells them what it needs.

---

## Open dials

1. **`tally` vs `mark`** — verb name. *Lean `tally`* (it's a tally sheet).
2. **Direction** — *resolved: guard both ways, tally inbound only.* He guards
   the crossing both directions, but only the **inbound** arrival (terminal →
   his room, `east`-in) tallies. See *What counts* above (incl. the re-entry
   inflation — the third inaccuracy).
3. **Hangs vs wielded** — *lean hangs* (paddle occupies his hands).
4. **Tail length / windowing** — how many recent marks `look` shows; pin
   when the read model is built. Don't cap the *count* silently.
