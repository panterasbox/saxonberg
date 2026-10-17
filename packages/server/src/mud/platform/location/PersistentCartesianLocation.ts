/**
 * PersistentCartesianLocation — ONE authored place on a grid whose state
 * outlives the process (cleanliness D31a).
 *
 * `SingletonCartesianLocation` keeps no record: it is one row, one place,
 * and whatever happens in it is gone at a restart. That was right while a
 * venue held only what its row put there. A place that is KEPT — a floor
 * mucked out or let go, a flue swept or not, a tub of hot water, the soap
 * curing on the chandlery's rack — has state an act made, and a restart
 * that forgets it is the fiction betraying itself.
 *
 * So this is the singleton with `PersistableMixin` outermost: ONE row, ONE
 * place, ONE `holder_snapshots` record keyed by its template path.
 * `StuffApi.singleton` already restores it (or seeds its `props:` and
 * captures the first record) — the shipped path every persistable
 * singleton takes. Props capture as unstamped contents with their fields;
 * chattel persists owner-side; cast is transient and re-seeded; the air's
 * contents (dust, fumes) ride the place's own runtime state; and the
 * fixtures' runtime state — the floor's soil — rides `AdornableMixin`'s
 * fixture slice.
 *
 * ⛔ Not `FurnishableRoom`: that is the interior somebody furnishes,
 * minted many times per row and keyed per holding, and it authors no
 * `coords`. A venue is authored once, on a grid.
 */

import SingletonCartesianLocation from './SingletonCartesianLocation';
import { PersistableMixin } from '../../lib/persistence/Persistable';

export default class PersistentCartesianLocation extends PersistableMixin(
  SingletonCartesianLocation,
) {}
