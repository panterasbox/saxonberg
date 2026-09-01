/**
 * PersistentCartesianLocation — a coordinate room that keeps **a record of
 * its own**: `PersistableMixin` over the cartesian stack.
 *
 * The missing cell in the room taxonomy:
 *
 *   - `CartesianLocation` — the permissive minted kind (post-residences:
 *     no SingletonMixin); `SingletonCartesianLocation` — one row IS one
 *     place, transient contents (rebuilt from `props:`/`cast:` each boot).
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
 * Composes over `SingletonCartesianLocation`, not the lib base: post-
 * residences the mixin SUBTRACTS (`SingletonMixin` opts a class into
 * one-live-instance-per-row; the unmarked `CartesianLocation` is the
 * permissive minted kind), and a durable room over the permissive base
 * would silently share ONE `holder_snapshots` scope across every mint.
 */

import SingletonCartesianLocation from './SingletonCartesianLocation';
import { PersistableMixin } from '../../lib/persistence/Persistable';
import type { FieldMeta } from '../../lib/mixin';

const PersistentCartesianLocationBase = PersistableMixin(
  SingletonCartesianLocation
);

export default class PersistentCartesianLocation extends PersistentCartesianLocationBase {
  static fieldMeta: FieldMeta = {};
}
