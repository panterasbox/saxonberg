/**
 * Bar — Dave's Bar, the singleton room one exit north of the lounge host.
 *
 * NOT a Warren member: never cloned, budded, drained, or reaped. A
 * persistent singleton room; the Warren wires the back-exit (south, to
 * the host) when it designates or migrates the host, so that exit is NOT
 * declared in the seed. v1 ships it as a bare shell (description + the
 * back-exit); Dave the NPC, drinks, `sit`, and the menu are deferred.
 *
 * A plain zone-less Exitable/Visible/Detailed `Location`. `SingletonMixin`
 * pins it to one instance per path (the host-fixture wiring resolves it
 * via `StuffApi.singleton`).
 */

import SingletonCartesianLocation from '../../../platform/location/SingletonCartesianLocation';
import type { FieldMeta } from '../../../lib/mixin';

// `StagedMixin` lets the bar stock itself declaratively from the seed's
// `props:` list on hydration — the crafting fixtures (back-bar, bottles
// + tools placed `onto` it, the menu) and the cast (each NPC a non-singleton
// clone moved in), all fresh each boot (transient runtime). The bar is
// otherwise a plain room: crafting is location-agnostic, so there is NO
// venue mixin — "Dave's Bar" is emergent from the matter and the maker
// present in it. See docs/subsystems/behavior.md and crafting.md. The bar
// receives pay-as-you-go through its account + the priced Menu; no tab (the
// soft-credit `TabMixin` was retired — zero credit until it is designed for
// real, see docs/subsystems/banking.md).
/*
 * ⭐⭐ **Cartesian, because every location plots on some coordinate
 * system.** The bar was a plain `Location` in a `FolderZone`, so
 * `bar --north--> office` was a cardinal exit pair with no geometry
 * under it — the door named a direction the world could not check.
 * `/world/lounge` is a `CartesianZone` now and the bar is its origin.
 */
// ⭐ `PerceptibleMixin` — a room is addressable by keyword. ⚠ Composed
// per class because `Location` does NOT carry it (only
// `CartesianLocation` does), so every room class built directly on
// `Location` has to remember. These rows were authoring `primaryKeyword`
// into a void until 2026-09-11; `lint:presentation` clause (d) found it.
// ⭐⭐ **Dave's Bar was in no grid, and its own row said so.**
//
// This class restated `SingletonCartesianLocation`'s mixin set on a
// plain `Location` — `Singleton(Staged(CartesianCoordinates(Exitable(
// Location))))` — which composes the `coordinates` FIELD but not the
// `coords` field, because `coords` lives on the `CartesianLocation`
// CLASS, not on a mixin. `bar.yaml` authors `coords:` under a comment
// reading *"`coords:` is the MEMBERSHIP operation"*, and the Hydrator
// discarded it silently: the bar held no position and belonged to no
// zone, in a `/world/lounge` that IS a `CartesianZone`.
//
// ⚠ `lint:locations` could not see it — its `unzonedCoords` clause
// filters on cartesian CLASSES, and this was not one. The orphan
// inventory had it all along as `bar.yaml: data.coords`.
//
// ⭐ Extending the real class is the whole fix. `CartesianLocation`
// already overrides `onCreate` to chain and then call
// `verifyOutboundExits()`, which is the only thing this class's own
// override did — so the body is empty now. ⚠ Deleting the class
// outright (the `Bench` precedent) is the further step and is FILED,
// not taken: four lounge test files import it, and a locality class
// with a name is not the same smell as a duplicated base.
export default class Bar extends SingletonCartesianLocation {
  static fieldMeta: FieldMeta = {};
}
