/**
 * Locker — ⭐ a kept container that holds goods for named people
 * (persistence-model N3): a rented locker, a coat check, a landlord's
 * storeroom. Custody, never title: a good checked in stays its owner's,
 * and its owner takes it back with `rack reclaim`.
 *
 * `PersistableMixin(HeldGoodsMixin(FixtureMixin(Holder)))` — the custody
 * base (`HeldGoodsMixin`) on a fixed holder, KEPT: what is in a locker is
 * as its holders left it after a restart, wherever the locker stands. A
 * locker in a plain room is keyed by its part name (D2), so the room can
 * restage while the locker's inside keeps. The house's check rack is a
 * locker that takes only weapons (`CheckRack`).
 *
 * `FixtureMixin` lets a locker declare `seatIn: <warren>` and follow an
 * elastic host; a locker in a fixed room leaves it unset.
 */

import Holder from '../../lib/stuff/Holder';
import { PersistableMixin } from '../../lib/persistence/Persistable';
import { FixtureMixin } from '../../lib/stuff/Fixture';
import { HeldGoodsMixin } from '../../lib/retail/HeldGoods';
import type { CommandContributions } from '../../api/command';
import type { FieldMeta } from '../../lib/mixin';

const LockerBase = PersistableMixin(HeldGoodsMixin(FixtureMixin(Holder)));

export default class Locker extends LockerBase {
  static fieldMeta: FieldMeta = {};

  /** Seat into the declared `seatIn` once registered; a no-op when unset. */
  async onCreate(): Promise<void> {
    await super.onCreate();
    await this.seatSelf();
  }

  static commandContributions: CommandContributions = {
    self: [],
    peers: ['platform/cmd/retail/rack.yaml'],
    environment: ['platform/cmd/retail/rack.yaml'],
  };
}
