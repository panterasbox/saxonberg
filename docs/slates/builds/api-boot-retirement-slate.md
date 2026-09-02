# Slate — retiring `Api.boot()`: the roster warms itself

**Seeded 2026-09-01** (the fermentation build's MR conversation; the
first conversion — `FermentApi.boot` → `FermentProfileCatalogue` —
shipped with that MR as the exemplar).

## The complaint, and why it is right

Apis are the surface CONTENT DEVELOPERS consume — `callable == visible
== cared-about`. `boot()` is an operator-shaped, run-once act: it does
not belong on that surface, it pollutes the generated consumer docs,
and it grows a hand-ordered `await XApi.boot()` sequencer in
AppBootstrap that the boot manifest was built to replace.

**The root cause is structural, not sloppiness.** The logic singletons
at `/platform/idea/api/*` are deliberately template-less (the reserved
prefix — no rows), so they have no `postRegister` and cannot appear in
the boot manifest. Anything whose warm-state got homed in a Logic
needed an external caller; the only named caller was the Api. The fix
is never "gate boot() harder" — it is to home the warm on something
TEMPLATE-BACKED that warms itself, which is already the house pattern:
seven catalogues (Discipline, Recipe, Spell, Blueprint, Help,
Government, Archetype — and now FermentProfile) ride `postRegister` +
the platform pack's `boot:` list.

## What boot() actually does today (the inventory)

| Call site | What it really is | Target shape |
|---|---|---|
| `MaterialApi.boot()` | ROSTER standup: every `*/idea/material/*` row, class-filtered `instanceof Material`, stood as live singletons | a self-warming `MaterialRosterCatalogue`-style singleton (the FermentProfileCatalogue conversion, verbatim) |
| `ConditionApi.boot()` | Same shape over `/platform/idea/Condition` descendants | same |
| `WorldClockApi.boot()` | STATE RESTORE (the persisted game-time anchor, a Document) + starts the heartbeat backstop | `WorldClockRegistry` is ALREADY template-backed and manifest-booted — the restore + backstop move into its `postRegister` (the old "can't live in BootstrapManager" comment predates the manifest's current shape) |
| `RenownApi.boot()` + `RenownStanding.warm()` | cache warm + ingestion-tap + schedule install | the standing singleton's `postRegister` |
| `RecordApi.boot()` | frame-store init | likewise, on its registry |
| `AppSettings.warm()` | the settings cache — everything reads it | ⚠ the ordering keystone, see below |

## The two real risks

1. **Ordering.** The sequencer is imperative and readable; the
   manifest is declarative with per-entry `dependsOn`. Every ordering
   the sequencer encodes (settings → clock → materials → conditions →
   …) must become explicit `dependsOn` edges on the platform pack's
   entries — a boot-order bug becomes a manifest-data bug. That is a
   feature (reviewable data), but the migration must move the whole
   chain at once or verify each hop.
2. **`AppSettings.warm()` runs AFTER `BootstrapManager.run()` today**,
   so manifest `postRegister`s cannot read settings (a live failure
   class — see the SeznickHouse destruct-path warnings). Any warm that
   moves INTO the manifest and reads a dial needs settings warmed
   first: either settings-warm becomes step zero of AppBootstrap
   (before the manager), or the affected postRegisters keep the
   seeded-literal `dial()` fallback discipline. Decide once, in this
   build.

## The shape of the build

Small, mechanical, one wave per Api: move the warm into the
template-backed singleton's `postRegister` (create the catalogue where
none exists), add the platform `boot:` entry with `dependsOn`, delete
the Api static + the sequencer line, repoint the drift-guard manifest,
keep each old boot test as the catalogue's postRegister test + a
pack.yaml wiring assert (the FermentProfileCatalogue.test shape).
Acceptance: AppBootstrap's sequencer contains ZERO `Api.boot()` lines;
the consumer doc projection shows no boot() anywhere; a fresh-DB boot
stands every roster (the inert-at-boot recurrence stays closed —
that guarantee must not regress in the move).

## Explicitly out of scope

`ScheduleApi`/tick installation generally (only the warms named
above); any change to WHAT gets warmed; the query surfaces (those
either stay on their subsystem Apis — Material/Condition have real
consumer mandates — or, where an Api exists ONLY for its boot, the
queries fold onto the owning class as statics, the FermentProfile
precedent).
