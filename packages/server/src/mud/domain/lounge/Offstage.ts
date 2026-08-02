/**
 * Offstage — a singleton holding room with no player-reachable exits,
 * where the `shifts` brain parks cast members who are fully off (outside
 * their scheduled hours). Players never see it; it exists only so an
 * off-duty NPC has somewhere to *be* (the world conserves identity — we
 * relocate the NPC rather than destroy/respawn it).
 *
 * Materialized on demand by `shifts` via `StuffApi.singletonOrClone`.
 * A plain singleton `Container` Location (Visible/Detailed for the
 * description an operator sees if they teleport in); deliberately not
 * `Exitable`.
 */

import Location from '../../lib/stuff/Location';
import { VisibleMixin } from '../../lib/description/Visible';
import { DetailedMixin } from '../../lib/description/Detailed';
import { PostRegistrationMixin } from '../../lib/stuff/PostRegistration';
import { SingletonMixin } from '../../lib/stuff/Singleton';
import type { FieldMeta } from '../../lib/mixin';

const OffstageBase = SingletonMixin(
  PostRegistrationMixin(DetailedMixin(VisibleMixin(Location)))
);

export default class Offstage extends OffstageBase {
  static fieldMeta: FieldMeta = {};
}
