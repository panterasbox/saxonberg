# Object — Gus's pocket watch (staging)

> **Status:** staging draft (full object spec).
> **Belongs to:** Gus, the crossing guard (the EU campus-gate stop).
> **Target seed paths:**
> - `Watch` class (the reusable *kind*) → a thin Stuff class under
>   `mud/obj/` *(the instruments are thin classes in `mud/obj/instrument/`;
>   exact home TBD — a watch isn't a `measure` instrument).*
> - Gus's specific watch (the *instance*) → a seed under
>   `mud/seeds/obj/.../pocket-watch.yaml`.
> - `wind` / `set` commands → `mud/cmd/{wind,set}.yaml` +
>   `mud/obj/command/{Wind,Set}Controller.ts`.
> - **`WorldClockApi` + the world-clock subsystem** → its own
>   slate/subsystem; this watch is a consumer, not its owner.
> **Retire when:** the `Watch` class, Gus's seed, the `wind`/`set`
> commands, and the world-clock are cemented in code/YAML. Then delete.
>
> Voice/character source: Gus's sheet (the crossing-guard NPC). Source-
> scoping (`watch::set`) + provenance-help: the affordance-verb slate.

A worn analog **pocket watch on a chain** — mechanical, hunter-cased,
deliberately old. It is the deepest-mined object in the project so far,
and it bought the platform a world-clock, source-scoped verbs, and a
command-provenance help surface on the way. Most of that lives elsewhere;
this doc is the object itself.

The reason it's this detailed: it's Gus's **single defining prop**, and
Gus is the deliberate-throwback NPC at the campus threshold. The watch
carries his whole character — endurance, habit-not-hope, the relief that
never comes — in one object.

---

## Form

- A thin **`Watch` class** (extends `Thing`) — the reusable *kind*; Gus's
  is one seeded *instance*. (Thin content classes are precedented — the
  biome instruments are thin `Thing` subclasses.)
- Composes **`Sealable`** — the **hunter-case lid** (flip open to read,
  snap shut). Drives the global `open`/`close`.
- Composes **`Detailed`** — the **engraving** on the case back.
- A real, separate, **carried** Thing (on a chain) — *not* a Detail of
  Gus — so it can be inherited down the chain someday (see Backstory).
- **Case material:** open dial — **steel** is available today; **brass**
  (the right look for an old watch) would add `zinc` + a brass alloy to
  the material taxonomy (broadly useful; a small content-pulls-platform).
  *Lean brass, accept the zinc/brass additions.*

---

## How it tells time (the model)

**It keeps its own time. It does not display the world-clock.** The
world-clock is only the *ruler* it measures elapsed seconds against — like
a real mainspring — never the value shown.

```
reading = setTo + (WorldClockApi.now() − setAt) × rate      # while running
```

- `setTo` — the time it was last *set* to.
- `setAt` — the world-clock instant of that set.
- `WorldClockApi.now()` — consulted only for elapsed real time; never shown.
- `rate` — drift; ~slightly-slow, a **tunable field** (value doesn't
  matter beyond "easy to tune").
- **Wound/running:** advances only while wound; unwound → freezes (stops)
  and resumes from where it stopped when rewound (falling further behind).

So the displayed value is the watch's *own, drifted* belief about the
time. It equals true time only right after a correct `set` and slides away
after. **Gus winds it daily (habit) so it runs, and never `set`s it, so it
reads slow** — and he trusts it completely. That's the character, and it
only works *because* it's mechanical-and-drifting, not synced.

### The `Timekeeping` capability — `currentReading()`

The reading is exposed by a capability mixin, **`Timekeeping`**, which
supplies one contract method: **`currentReading()` → the time this object
displays (its own belief), or `null` when it can't be read right now.**
`Watch` composes it; its `currentReading()` is the drift formula above,
**gated by the lid:**

```
Watch.currentReading() = lid shut ? null : (setTo + (now − setAt) × rate)
```

(Unwound-but-open still returns a value — frozen and wronger, but readable.
Only a *shut* lid returns null.)

**The lid-gating lives in `currentReading()`, not in `getLong()`** — so
*every* consumer respects it through one seam:

- **`getLong()` consumes `currentReading()`** for the human's look: null →
  "the lid is shut"; else `static prose + formatted reading`.
  `getMarkupLong(viewer)` calls `getLong()` fresh each look, so this is
  dynamic for free — not an augmenter, not a read-verb; the object just
  computes its own description off the capability.
- **`tally` (the crossing-log) consumes `currentReading()`** for the value
  — null → a bare untimed tick. So "lid shut," "in an opaque box," "dark
  room," and "sundial at night" all collapse to the *same* null, and the
  read/look paths never diverge. (See `crossing-log.md` and the
  scope-modality slate.)

Why a capability and not a `Watch` base class others extend: a sundial, a
wall clock, a phone all *tell time* but are not "a kind of pocket watch"
(no mainspring, no lid, no `wind`) — and a clock tower is a `Location`, so
it must *compose* time-telling with being a place. One narrow read-contract,
composed onto heterogeneous classes; `tally` reads any of them via
`MixinApi.hasMixin(x, Timekeeping)` without an `instanceof` ladder.
`Timekeeping` supplies the *reading* only — the `wind`/`set` verbs stay
object-carried on `Watch`; it is **not** the verb-granting "Timepiece mixin"
that was rightly rejected.

---

## Verbs

| Verb | How it's granted | Notes |
|---|---|---|
| `look` | global | shows the watch (static prose + computed reading via the getter) |
| `open` / `close` | **global, gated by `Sealable`** | the hunter lid; reading visible only when open |
| `wind` | **carried by the watch** (object-specific command, like `Thermometer` carries `measure`) | resets `wound` → keeps it running; Gus issues `wind watch` daily |
| `set` | **carried by the watch** | `set watch 4:00` — set to an **explicit time** only (writes `setTo`/`setAt`). **No** auto-sync-against-a-source: that's a *digital*-watch trait, not this mechanical one. Gus never issues it → drift |

No new mixin grants these. `open`/`close` ride the earned `Sealable`
capability; `wind`/`set` are commands the watch carries. (Verbs don't come
from mixins — they're global+capability or object-carried.)

**Source-scoping** (`watch::set 4:00`) and command-provenance help are the
broader features this watch surfaced; they live in the affordance-verb
slate, not here.

---

## Not-takeable (without a flag)

The watch carries no "untakeable" flag. It's protected by **being on
Gus's person**: `get` is room-scope ("peers") only, so taking it off a
person needs `give` (Gus refuses) or `steal` (doesn't exist). So carried =
safe, with zero special-casing. Theft becomes possible only once a `steal`
mechanic exists — at which point its consequence/crime layer lands with it
(build-everything → together). Holds only while Gus *holds* it; he'd no
sooner set his watch down than abandon his post.

---

## The engraving (backstory)

On the case back, a `Detailed` detail, in a fine worn hand — readable lid
open or shut:

> **AUGUSTUS**
> *Keep good time, and keep the watch.*
> *Someone will be along to relieve you.*

No "to," no "from" — just the name and the charge — so you can't tell
whose name it is: the keeper before Gus, the one before *him*, or the man
holding it now. **"Keep the watch"** does double duty (the timepiece / the
vigil); *"someone will be along to relieve you"* is the comfort each keeper
engraves for the next — the promise the chain never quite keeps, though it
implies it was kept *once* (someone handed this on).

The loop: the watch belonged to the keeper before; **Gus is the relief who
came and stayed** — arrived to relieve the last keeper, took the watch and
the post "just till things settled," and was never relieved himself. The
post is a *chain*, the watch passed down it. His **no-memory** seals it: he
swears he's been here "since the start," and the watch is the one artifact
proving he was once new.

And the knife: **"Gus" is sitting inside "Augustus."** A player might catch
it; Gus never has. Ask him and he says it belonged to the fellow before —
*"I'm Gus"* — which is either perfectly true or the saddest thing on
campus, and the watch refuses to say which. (His denial is habit-not-hope:
not wondering, just answering. The full reaction lands when npc-dialogue
ships.)

---

## The payoff — a someday that stays a someday

No resolving payoff (a completed character is spent in a live world). His
reward is **renewable**: every crossing is his small win, and because he
never remembers, every one is the first — fresh forever.

The **someday bus**: if player-jobs ever let a player relieve Gus, the
player **inherits the watch** (the engraving gains a name) and becomes the
next link — forward-compatible *by the chain we built*, not a retrofit.
It's left **unloaded** ("let somedays stay somedays"); the engraving's
*"someone will be along to relieve you"* quietly rails it without promising
it. Spend it only as a deliberate, one-time, far-future sendoff.

---

## What this object surfaced (build list)

Content-pulls-platform — a crossing guard's pocket forced all of this:

- **`WorldClockApi` + the world-clock subsystem** — ground-truth game
  time (the elapsed ruler). Its own slate/subsystem.
- **The `Timekeeping` capability mixin** — `currentReading() → Time | null`,
  composed onto `Watch` (and any future sundial / clock / phone). Read by
  `tally` (and the watch's own `getLong`). The cross-family seam for
  time-telling; *see also* the **scope-modality slate**
  (`docs/slates/scope-modality-slate.md`) — `tally` resolves the timepiece
  over *sight* scope (clear cases / wall clocks readable, shut lids not).
- **`wind` / `set` commands** — carried by the watch.
- **The thin `Watch` class** (+ Gus's seed instance).
- *(in the affordance-verb slate)* **source-scoped invocation** +
  **command-provenance help**.
- *(if brass)* **`zinc` element + brass alloy** in the material taxonomy.

Reuses, no new: `Thing`, `Sealable`, `Detailed`, and the global
`look`/`get`/`give`/`open`/`close` — plus the carried-command mechanism the
instruments already establish.

---

## Open dials

1. **Case material** — steel (today) vs brass (+zinc/brass alloy). *Lean
   brass.*
2. **Drift `rate`** — exact default; tunable, so cosmetic. *Lean a few
   minutes slow.*
3. **Engraving wording** — committed above; dial if a better line appears.
4. **`Watch` class home** — `mud/obj/` vs alongside instruments; it isn't a
   `measure` instrument, so probably plain `mud/obj/`.
