/**
 * Corridor — one dorm floor's hallway. A runtime clone (one per live
 * floor), NOT a Warren member: the `DormWarren` keeps corridors in its own
 * `_corridorsByFloor` map, outside `_members`, and owns their lifecycle
 * (build on `ensureFloor`, reap top-down on `reconcile`, destruct on
 * `teardown`).
 *
 * A plain non-coordinate `Location` (a clone can't hold fixed grid coords;
 * it hangs off the lobby / the floor below by live-ref stair exits, not grid
 * adjacency) with the exit + description surface. It holds the floor's
 * `DormDoor`s and the `down` (to the floor below) + `up` (a `FloorStairExit`)
 * stairs. No persistence — floors reconstitute from the durable slot set.
 * No `Named` — a generic labelled room.
 *
 *   Exitable → Detailed → Visible → PostRegistration → Location
 */

import Location from '@saxonberg/server/mud/lib/stuff/Location';
import { ExitableMixin } from '@saxonberg/server/mud/lib/boundary/Exitable';
import { VisibleMixin } from '@saxonberg/server/mud/lib/description/Visible';
import { DetailedMixin } from '@saxonberg/server/mud/lib/description/Detailed';
import { PostRegistrationMixin } from '@saxonberg/server/mud/lib/stuff/PostRegistration';
import type { VetoResult } from '@saxonberg/server/mud/lib/errors';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';

const CorridorBase = ExitableMixin(
  DetailedMixin(VisibleMixin(PostRegistrationMixin(Location))),
);

export default class Corridor extends CorridorBase {
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
