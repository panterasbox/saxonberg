/**
 * OpenWorking — ⭐ **one row IS one pit**, and it keeps a record.
 *
 * `PersistableMixin(OpenWorkingMixin(SingletonCartesianLocation))` — the
 * `Wood` composition, and for the same reason. A pit is a **singleton**: it
 * is reached by an exit and there is exactly one of it, so its template path
 * is its identity. And it is **persistable**, because a worked pit is a
 * changed pit: the floor is deeper than the row says and three bands are
 * part-worked, and a restart must not put the stone back.
 *
 * ⚠⚠ **That is the one place this differs from the mine's authored
 * gallery.** `AuthoredWorking` is deliberately NOT persistable — *"a held
 * CARVED cell is the thing that needs a record"* — so a hand-authored
 * gallery re-reads `workedFaces` from its template every boot. A quarry
 * cannot accept that: a quarry has no warren to hold the record for it, and
 * the whole of its depletion lives on the room.
 *
 * Restore is `singleton()`'s: an exit's destination resolves through
 * `resolveLanding` → `StuffApi.singletonOrClone` → `singleton()`, which
 * **restores when a `holder_snapshots` record exists under the room's
 * template path** and seeds from the row otherwise, capturing as it goes.
 *
 * ⚠ **No soil and no reserves.** A quarry floor is rock, not ground anybody
 * grows anything on, and composing `SoilMixin` here would claim otherwise.
 * The turbary is the composition that DOES want soil and improvement, and
 * it is a separate class for exactly that reason.
 */

import SingletonCartesianLocation from '@saxonberg/server/mud/platform/location/SingletonCartesianLocation';
import { PersistableMixin } from '@saxonberg/server/mud/lib/persistence/Persistable';
import { OpenWorkingMixin } from '../lib/Working';

const OpenWorkingBase = PersistableMixin(
  OpenWorkingMixin(SingletonCartesianLocation),
);

export default class OpenWorking extends OpenWorkingBase {}
