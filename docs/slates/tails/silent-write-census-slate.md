# Silent writes — census, then ratchet

> **Status: UNBUILT · opened 2026-10-29 (owner, ceramics review !437).**
> **Left:** the census gate · sorting each guard as a read (legitimate
> skip) or a write (a defect) · the burn-down.
> **Size:** a tail (a gate, then a sweep).

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

- **An async completion has no root to reach** (ceramics review, B103).
  The scheduler's `onComplete` is synchronous (`SchedulerRegistry
  .safeInvokeComplete`): a sync throw is logged and the step aborted with
  `thrown`, but a completion that returns a promise has already left the
  root when it rejects. `ManualBuildController.engagePlan` now catches and
  logs, so nothing is an unhandled rejection; still missing are the author
  diagnostic and the `thrown` envelope a sync throw gets. The fix is the
  scheduler awaiting a returned promise under `runRootGuarded('swallow')`.

## Rides into

Any build. It is a sweep with a gate. The first consumer is the next build
that touches a write path.
