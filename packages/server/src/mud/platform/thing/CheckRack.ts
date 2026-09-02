/**
 * CheckRack — the weapons-check rack: a **persistable** container fixture
 * that takes a patron's arms into custody (their owner-stamps stay put)
 * against a claim ticket, and hands them back on `reclaim`. Custody, never
 * title — the bar-fight build's coat-check-with-teeth.
 *
 * The sibling of {@link ConsignmentShelf}: it rides the SAME
 * `ConsignmentShelfMixin` custody + listing machinery and the SAME
 * load-bearing `PersistableMixin` (so checked weapons survive a relog /
 * server bounce while in the house's custody). It differs only in what it
 * affords — `check` (custody-in) + `reclaim` (custody-out), never
 * `consign`/`buy`: a checked weapon is `heldOnly`, held for its owner, not
 * brokered. `reclaim` is reused verbatim (it resolves any
 * `ConsignmentShelfMixin` fixture and authorizes on `ChattelApi.ownerOf`,
 * not the listing), so taking someone else's checked piece stays theft.
 */

import { Vessel } from "../../lib/stuff/Vessel";
import { DetailedMixin } from "../../lib/description/Detailed";
import { PersistableMixin } from "../../lib/persistence/Persistable";
import { PostRegistrationMixin } from "../../lib/stuff/PostRegistration";
import { FixtureMixin } from "../../lib/stuff/Fixture";
import { ConsignmentShelfMixin } from "../../lib/retail/Consignment";
import type { CommandContributions } from "../../api/command";
import type { FieldMeta } from "../../lib/mixin";

// `FixtureMixin` lets a rack declare `seatIn: <warren>` and follow an
// elastic host (the lounge's rack rides the Warren host the way the TPA
// terminal does — re-seated on host migration). A fixed-room rack just
// leaves `seatIn` unset and is placed by ordinary containment.
const CheckRackBase = PersistableMixin(
  ConsignmentShelfMixin(
    PostRegistrationMixin(FixtureMixin(DetailedMixin(Vessel))),
  ),
);

export default class CheckRack extends CheckRackBase {
  static fieldMeta: FieldMeta = {};

  /** Seat into the declared `seatIn` (the Warren host, or a location) once
   * registered — the host-following fixture contract. No-op when unset. */
  async postRegister(): Promise<void> {
    await super.postRegister();
    await this.seatSelf();
  }

  static commandContributions: CommandContributions = {
    self: [],
    peers: [
      "platform/cmd/retail/check.yaml",
      "platform/cmd/retail/reclaim.yaml",
    ],
    environment: [
      "platform/cmd/retail/check.yaml",
      "platform/cmd/retail/reclaim.yaml",
    ],
  };
}
