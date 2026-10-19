/**
 * Corridor — one dorm floor's hallway. A runtime clone (one per live
 * floor), NOT a Warren member: the `DormWarren` keeps corridors in its own
 * `_corridorsByFloor` map, outside `_members`, and owns their lifecycle
 * (build on `ensureFloor`, reap top-down on `reconcile`, destruct on
 * `teardown`).
 *
 * A `Location` — one of many, one per live floor — and on the hall's grid
 * like every place but the void: a clone holds no authored coords, so it
 * takes the cell its `down` stair says it is in (`plotBesideNeighbour`,
 * from `CirculationWarren.ensureNode`): floor 1 one cell above the lobby.
 * Sized by the hall's cell, like every Location. It holds the floor's
 * `DormDoor`s and the `down` (to the floor below) + `up` (a `FloorStairExit`)
 * stairs. No persistence — floors reconstitute from the durable slot set.
 * No `Named` — a generic labelled room.
 *
 *   Location (Staged → Exitable → CartesianCoordinates → Place)
 */

import Location from '@saxonberg/server/mud/lib/location/Location';
import type { VetoResult } from '@saxonberg/server/mud/lib/errors';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';

export default class Corridor extends Location {
  static fieldMeta: FieldMeta = {};

  /**
   * Never culled by residency: a corridor is not a Warren member, so it does
   * NOT get `WarrenMemberMixin`'s free eviction veto — the `DormWarren` owns
   * its lifecycle (top-down reap in `reconcile`), and residency must not pull
   * the stair chain out from under it.
   */
  public canEvict(): VetoResult {
    return { ok: false, reason: 'dorm corridor; DormWarren owns its lifecycle' };
  }
}
