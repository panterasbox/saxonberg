# Silent writes — census, then ratchet

> **Status: PARTIAL** — the gates shipped with the failure-model build
> (2026-11): `lint:silent-catch` and `lint:floating-promises` are the census,
> at today's count, and the async-completion root (B103) is owned
> (`SchedulerRegistry` reports a rejected completion).
> **Left:** the burn-down of both ratchets · sorting each `connected()` guard
> as a read (a legitimate skip) or a write (a defect).
> **Size:** a tail.
> **Absorbed by:** [failure-model-slate.md](./failure-model-slate.md)
> (2026-11-10): this census is the write half of the broader throw /
> refuse / return-nothing conversation.

The policy is in [spatial.md § Writes on a detached subject](../../subsystems/spatial.md):
a write whose subject stands nowhere checks first, never invents a place,
throws `DetachedError`, and is reported by the guarded roots. A read skips,
per the matrix. The reason for this slate is the owner's: a silent skip,
once it is in the tree, becomes the pattern everything copies.

## The census

Count, in `packages/server/src/mud` and every pack's `src/`:

- `if (<x> === null) return;` and `if (!<x>) return;` where `<x>` is an
  environment read (`getContainer()`, `getEnclosingScope()`, a floor or
  scope lookup), and the code after it WRITES (a `move`, a `clone`, a
  `transfer`, a setter);
- `catch { … }` blocks that swallow a mint or a move (`StuffApi.clone`,
  `ContainmentApi.move`) and carry on.

A quick grep at opening found about 23 bare null-returns in production
code. They have not yet been sorted into reads and writes.

## The ratchet

`lint:silent-writes`, holding the count as a ceiling (the
[lint-family](../../lint-family.md) census-then-ratchet pattern). Each one
burned down becomes a precondition check plus `DetachedError`, or is shown
to be a read and annotated as one.

## Known ones (from the ceramics review)

- `BulkableMixin.sufferImpact`: a breaking vessel spills to the floor
  `if (litres > 0 && from && floor)`, so with no floor the spill is
  skipped silently. Its Integrity break now throws first for a detached
  vessel, but the floor-less (yet attached) case is still a silent skip.
- `Mould.creditDrainings`: what the vessel below has no room for "runs
  away". This one is a deliberate model, not a skip; annotate it as such.
- ~~`Thermal.reconcileBulkPhase`, a pool freezing in a vessel that is NOT
  a mould~~ — fixed in B105 (checked first, narrowed, a failed mint
  throws).

- **An async completion has no root to reach** (ceramics review, B103).
  The scheduler's `onComplete` is synchronous (`SchedulerRegistry
  .safeInvokeComplete`): a sync throw is logged and the step aborted with
  `thrown`, but a completion that returns a promise has already left the
  root when it rejects. `ManualBuildController.engagePlan` now catches and
  logs, so nothing is an unhandled rejection; still missing are the author
  diagnostic and the `thrown` envelope a sync throw gets. The fix is the
  scheduler awaiting a returned promise under `runRootGuarded('swallow')`.

- `ThermalMixin.restamp`: a failure to resolve the room's temperature
  (`BiomeApi.resolveTemperatureFor`) is caught and the old ambient kept
  (`catch {}`). Arguably a skip — a read that found nothing — but it hides
  a real error (a biome chain that cannot resolve), and a body then drifts
  toward a stale ambient forever. Decide: say it, or show it is only ever
  a legitimate miss. (Thermal review, B105.)
- ✅ Done in B105: Thermal's non-mould lump path (above), the melt
  (`doMelt` destroyed first and found no floor in a pail or a sack), and
  the crystallize arm's crop.

## Rides into

Any build. It is a sweep with a gate. The first consumer is the next build
that touches a write path.

## From crowded-rooms (2026-11-18, MR !598)

The room's own reading (light walk, sound gather, smell fold, card
projection) now holds the world still, and a body's size read and sight gate
read stored stocks. What that build named and left here:

- **A body has no clock of its own.** It integrates only at its own acts and
  deliberate reads, and an unowned body drops any gap over
  `MAX_REASONABLE_GAP_SEC`. Whether a cast member hungers still depends on
  whether something deliberately read it inside that window (narrower now,
  not gone). A body's own wake (the mould's D8 shape) would make the whole
  cast metabolize unwatched — a change to what the world does unwatched, so
  the owner's call.
- **Two timed transitions with no closed-form deadline:** bleed-out onset
  (`beginDying` at the blood floor) and sustained-shock relief happen only in
  a reconcile. A dying PLAYER's window end is now booked on the clock
  (`nextInterestingAt`); these two are not.
- **Reconcile-on-read sites the walks do not reach** — any of them may make a
  thing's state depend on who looked; the walks' tripwire
  (`WalkWriteError`) catches only what a walk reaches.
