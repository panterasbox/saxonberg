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
  **Self-enrollment, never a scan**: the enrolled set contains exactly
  the things that care.
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
3. **Whether Stuff may subscribe directly, or only subsystems.** The
   persistable capture wants per-instance enrollment; the record layer
   wants one subsystem-level handler. If both, the seam has two
   registration shapes and should say so plainly.

## Scope, and what already moved

**Not this MR.** It touches lifecycle, persistence, the world clock and
the record layer, and questions 1–3 are genuine design rather than
mechanics.

**What the libations MR did do**, as a step in the same direction rather
than away from it: the persistable shutdown capture became
**self-enrolling** — `PersistableMixin` registers itself when it
establishes a persistence key and un-registers on destruct — which
deleted a `getAllObjects()` world scan and moved the knowledge from the
centre to the thing that owns it. `AppBootstrap` still names it; the
signal is what would stop that.

## Cross-references

[lifecycle.md](../../subsystems/lifecycle.md) (the destruction
choreography this should resemble) ·
[persistence.md](../../subsystems/persistence.md) (the capture spine) ·
[residency.md](../../subsystems/residency.md) (self-maintenance as the
house pattern) · [antipatterns.md](../../antipatterns.md) § *Bespoke
Object-Search Algorithms* (the scan half of the same finding) ·
[content-packs.md](../../subsystems/content-packs.md) (a pack ships
classes and brains, and today cannot care about shutdown).
