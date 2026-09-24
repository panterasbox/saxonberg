/**
 * CheckRack — the weapons-check rack: a **persistable** container fixture
 * that takes a patron's arms into custody (their owner-stamps stay put)
 * against a claim ticket, and hands them back on `reclaim`. Custody, never
 * title — the bar-fight build's coat-check-with-teeth.
 *
 * It composes the shared **`HeldGoodsMixin`** — the custody base (the coat
 * check, whole) — NOT `ConsignmentShelfMixin`: a checked weapon is held for
 * its owner to reclaim, never brokered, so the rack carries none of the
 * sale layer (no ask, no listing cap, no `buy`). `reclaim` narrows on the
 * shared `HeldGoodsShelf` surface (so it serves this and the store shelf
 * alike) and authorizes on `ChattelApi.ownerOf`, not on possessing the
 * ticket — so taking someone else's checked piece stays theft. The
 * consignment shelf is the same base plus a sale layer; a coat check is
 * just the base.
 */

import { Vessel } from "@saxonberg/server/mud/lib/stuff/Vessel";
import { DetailedMixin } from "@saxonberg/server/mud/lib/description/Detailed";
import { PersistableMixin } from "@saxonberg/server/mud/lib/persistence/Persistable";
import { PostRegistrationMixin } from "@saxonberg/server/mud/lib/stuff/PostRegistration";
import { FixtureMixin } from "@saxonberg/server/mud/lib/stuff/Fixture";
import { HeldGoodsMixin } from "@saxonberg/server/mud/lib/retail/Consignment";
import type { CommandContributions } from "@saxonberg/server/mud/api/command";
import type { FieldMeta } from "@saxonberg/server/mud/lib/mixin";

// `FixtureMixin` lets a rack declare `seatIn: <warren>` and follow an
// elastic host (the lounge's rack rides the Warren host the way the TPA
// terminal does — re-seated on host migration). A fixed-room rack just
// leaves `seatIn` unset and is placed by ordinary containment.
const CheckRackBase = PersistableMixin(
  HeldGoodsMixin(
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
