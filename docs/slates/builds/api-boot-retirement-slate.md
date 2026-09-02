# Slate — retiring `Api.boot()`: the roster warms itself

**Seeded 2026-09-01** (the fermentation build's MR conversation; the
first conversion — `FermentApi.boot` → `FermentProfileCatalogue` —
shipped with that MR as the exemplar).

⭐ **Scoped 2026-09-02 — this lands as PHASE A of the OO sweep, not as
its own build. The inventory below is UNDERSTATED (16 `boot()`s, not
6) — see the foot of this file.**

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

---

## Scoped 2026-09-02 — lands as Phase A of the OO sweep

Decided with the user: this slate is **not a standalone build**. It is
**Phase A** of [oo-calling-conventions-slate](./oo-calling-conventions-slate.md)
— one branch, one MR, one review, one full-suite run. It goes first
because it is mechanical and because it deletes Logic singletons the
OO waves would otherwise have to touch twice.

### ⚠ The inventory above is understated — it is 16, not 6

Re-counted against master `0c1a29285`. `static boot()` on an Api:

`WorldClockApi` · `MaterialApi` · `ConditionApi` · `RenownApi` ·
`ConsumerApi` · `ProducerApi` · `ResidencyApi` · `CardApi` ·
`SandboxApi` · `BankingApi` · `EmploymentApi` · `AttendantApi` ·
`SocialApi` · `PartyApi` · `PressApi` · `RecordApi`

...plus the hand-ordered singleton warms interleaved between them in
`AppBootstrap`: `AppSettings.warm` · `RenownStanding.warm` ·
`ParticipationStanding.warm` · `ProducerStanding.warm` ·
`AccountBalance.warm` · `SupplyAggregate.warm`, and the three relay
readers' own `boot()` (`Twitch`/`Youtube`/`Kick` — those are transport
lifecycle under mandate (c) and **stay**, but the `*Api.boot()` line
next to them should stop being their call-site symmetry argument).

So the sequencer is **~26 ordered lines**, not six. Every ordering it
encodes has to become an explicit `dependsOn` edge on the platform
pack's `boot:` entries — the migration's real cost, and the reason
this phase goes first while the tree is otherwise untouched.

The three named risks stand unchanged: **ordering**, the
**`AppSettings.warm()`-runs-after-`BootstrapManager.run()`** keystone,
and the inert-at-boot recurrence (a fresh-DB boot must still stand
every roster — that guarantee must not regress in the move).

### Acceptance (unchanged, restated)

`AppBootstrap`'s sequencer contains **zero** `Api.boot()` lines; the
consumer doc projection shows no `boot()` anywhere; a fresh-DB boot
stands every roster.
