/**
 * PersistentCartesianLocation — a coordinate room that keeps **a record of
 * its own**: `PersistableMixin` over the cartesian stack.
 *
 * The missing cell in the room taxonomy:
 *
 *   - `CartesianLocation` — singleton, coordinate-addressed, transient
 *     contents (rebuilt from `props:`/`cast:` each boot).
 *   - `FurnishableRoom` — keyed multi-instance interior unit (the
 *     furnishing archetypes, cloned per dorm/lot and keyed by its
 *     provisioner); no coordinates, no singleton shape.
 *   - **This class** — singleton AND durable: one row, one room, in a
 *     zone's coordinate grid, whose props write back to
 *     `holder_snapshots`.
 *
 * Built for the bespoke stateful venue: a hand-authored farm of
 * statically linked rooms (no warren) whose garden beds must keep their
 * soil state — a bed is not its own persistence host; its state rides
 * `captureHostOf`'s walk to the nearest persistable ancestor, and in a
 * plain `CartesianLocation` that walk finds nothing.
 *
 * No establishing context is needed: `StuffApi.singleton` IS the
 * establishing context for a keyless persistable singleton (restore when
 * a record exists under the scope, else seed the born-with `props:` and
 * capture the first record) — the same seam that stands up a venue's
 * `Stock` counter. Cast rides `cast:` as anywhere else: never captured,
 * re-seeded by `Persistable.reseedCast` on restore.
 *
 * `PersistableMixin` composes **outermost** (the host rule): its
 * `cleanupOnDestruct` must fire before the inner `Container` evacuates,
 * and its `applyProps`/`applyCast` overrides wrap `Populates`. The lib
 * base already carries `PostRegistration`/`Populates`/`Singleton`.
 *
 * A spherical twin (`PersistentSphericalLocation`) is derived the same
 * way when a spherical venue first needs one.
 *
 * ⚠ REBASE NOTE (!212 / residences): that branch takes `SingletonMixin`
 * OFF the lib cartesian base (the mixin SUBTRACTS — a class without it
 * still backs singleton rows via `StuffApi.singleton`; one WITH it can
 * back only those) and ships `SingletonCartesianLocation` as the marked
 * name. After the merge this class must compose over
 * `SingletonCartesianLocation`, or it silently becomes minted+durable —
 * every minted room sharing ONE `holder_snapshots` scope. !212's
 * platform/location walk test fails this file with the fix named.
 */

import CartesianLocationBase from '../../lib/location/CartesianLocation';
import { PersistableMixin } from '../../lib/persistence/Persistable';
import type { FieldMeta } from '../../lib/mixin';

const PersistentCartesianLocationBase = PersistableMixin(
  CartesianLocationBase
);

export default class PersistentCartesianLocation extends PersistentCartesianLocationBase {
  static fieldMeta: FieldMeta = {};
}
