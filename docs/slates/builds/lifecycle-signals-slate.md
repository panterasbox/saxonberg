# Lifecycle signals — the centre stops enumerating the periphery

*Design slate, 2026-08-30, from the libations review (MR !206). The
founder, looking at `AppBootstrap`: **"If something needs to care about
shutdowns, then there should be a properly observable hook. We shouldn't
be centralizing shit that is against the whole design philosophy."**
Correct, and it is the same failure mode this review removed three times
elsewhere.*

## The finding

`AppBootstrap.shutdown()` is a hand-maintained list of everyone who cares
that the process is ending:

```
CompileWatcher.get().stop()
  → WorldClockApi.shutdown()
    → RecordApi.flush()
      → [capture every persistable singleton]     ← added in this MR
```

Four subsystems, each **named explicitly by a central function**. Every
new subsystem that needs a shutdown signal edits this file.

⭐ **That is structurally identical to three things this same review
deleted**: `ToolCapability`'s kernel table naming each capability's verbs,
the closed `Technique` union with its kernel effects table, and
`GENERIC_*_MATERIAL` naming pack rows. The general rule those produced —
***when a peripheral thing needs a central list edited, the list is in
the wrong place*** — applies here unchanged, and the libations build
walked straight into it: the capture loop was added as a fourth entry
*and* scanned the whole world to find its own subscribers.

## Why it is against the philosophy specifically

Everywhere else, the framework **fires a signal and things declare their
own interest**:

| concern | the hook |
|---|---|
| destruction | `onDestruct()` witness, `canDestruct()` veto |
| residency | **self**-eviction, `canEvict()` veto |
| registration | `postRegister()` |
| persistence | `aroundSave` / `aroundDelete` |
| connection | `onLinkdead()` |

`AppBootstrap.shutdown()` inverts it. The centre enumerates the
periphery, so the periphery cannot be extended without editing the
centre — and a content pack, which can already ship classes and brains,
has no way to care about shutdown at all.

## The one real design question — ordering

A pure observer set loses ordering, and some of shutdown's ordering is
load-bearing: flush the record layer's write buffer **before** Mongo
closes; capture state **before** the world clock stops. That is exactly
why hand-written shutdown sequences survive in real systems, and any
proposal that ignores it will be quietly wrong.

**The answer is phases, not a list.** The signal carries a small ordered
vocabulary; a subscriber declares which phase it belongs to; order
*within* a phase is unspecified and must not be relied on.

| phase | meaning | today's occupants |
|---|---|---|
| `quiesce` | stop accepting new work; halt timers and watchers | `CompileWatcher`, `WorldClockApi` |
| `persist` | write durable state that is only in memory | the persistable capture |
| `flush` | drain async buffers | `RecordApi` |
| `close` | release connections and handles | the Mongo client |

Ordering that matters is expressed once, in the vocabulary, rather than
re-derived by whoever edits the sequence next.

## What it should look like

- A subscription seam on the lifecycle Api — a subscriber enrolls with
  its phase, and un-enrolls when it is destructed or torn down.

  ⚠ **But do not reach for enrollment where a PREDICATE will do.** The
  libations MR tried self-enrollment for the persistable capture first
  and removed it: the enrolled set held no fact the objects did not
  already hold, and the one reader re-derived every one of them anyway.
  See *What the libations MR did* below — the correction is the most
  useful thing this slate carries. Enrollment earns its keep only when
  membership is NOT derivable from the members: a subsystem-level
  handler with a phase and a closure has nowhere else to live; a set of
  Stuff answering "do I want this?" does.
- `AppBootstrap.shutdown()` becomes *fire the phases in order, await each,
  isolate failures* — and knows the name of nobody.
- Each existing occupant enrolls at its own init, beside the code that
  owns the concern.

**Three questions this slate does not answer**, and they are the build's
real content:

1. **A handler that throws.** Today each step is individually
   `try`/`catch`-ed so one failure cannot strand the rest. The signal
   must keep that property per subscriber, and say what is logged.
2. **A handler that hangs.** A shutdown that never completes is worse
   than one that drops a buffer. A per-phase deadline, after which the
   phase is abandoned with a loud record, is the likely answer — but the
   budget is a real decision, not a default.
3. **Whether Stuff may subscribe directly, or only subsystems.**
   ⭐ Provisionally ANSWERED by the correction above: **only
   subsystems.** The case for per-instance enrollment was the
   persistable capture, and that turned out to want a predicate and a
   query, not a subscription. If a second Stuff-level case appears, it
   should be made to prove membership is not derivable before the seam
   grows a second registration shape.

## Scope, and what already moved

**Not this MR.** It touches lifecycle, persistence, the world clock and
the record layer, and questions 1–3 are genuine design rather than
mechanics.

**What the libations MR did**, in two moves — and the second is the one
worth carrying into this build.

It first made the persistable shutdown capture **self-enrolling**: a
`PersistableRegistry` that `PersistableMixin` enrolled into on
`setPersistenceKey` and withdrew from on destruct, replacing a
`getAllObjects()` loop.

Then it **deleted that registry**, because the founder asked why a new
registry was needed and the answer was that it wasn't:

- It was a **third index of Stuff** beside `byId` and `byTemplatePath`,
  caching a fact every member already held.
- ⭐ **Its one consumer re-derived everything it cached** — `isPersistable`,
  a null key, `isDestroyed` — which is the tell. *A cache whose reader
  revalidates everything it caches is buying nothing.*
- It was maintained on every key-set and every destruct, **forever**, to
  save a single sweep at process exit.
- Membership could go stale on a hot reload, and needed an explicit
  withdrawal that a future caller could forget.

What replaced it: `capturesAtShutdown()`, a predicate the host answers
about itself (including the Avatar exclusion — an Avatar captures at
logout on its own seam), and the sanctioned world search at shutdown,
`world:[mixin.PersistableMixin]` in system mode. That is what
`lint:world-scan` points a bespoke `getAllObjects()` loop at in the
first place. Nothing to keep in sync; a destroyed host is simply not
there to answer.

⭐ **The distinction this build must respect.** *Who wants a signal* is
derivable when the subscribers are Stuff — ask them. It is NOT derivable
when a subscriber is a subsystem contributing a phase and a closure
(`CompileWatcher`, `RecordApi`), because there is no object to ask. This
slate's seam is for the second kind, and should not be widened into the
first. `AppBootstrap` still names those three; the signal is what would
stop that.

## Cross-references

[lifecycle.md](../../subsystems/lifecycle.md) (the destruction
choreography this should resemble) ·
[persistence.md](../../subsystems/persistence.md) (the capture spine) ·
[residency.md](../../subsystems/residency.md) (self-maintenance as the
house pattern) · [antipatterns.md](../../antipatterns.md) § *Bespoke
Object-Search Algorithms* (the scan half of the same finding) ·
[content-packs.md](../../subsystems/content-packs.md) (a pack ships
classes and brains, and today cannot care about shutdown).
