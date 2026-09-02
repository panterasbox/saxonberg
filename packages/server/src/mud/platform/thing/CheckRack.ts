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

import { Vessel } from "../../lib/stuff/Vessel";
import { DetailedMixin } from "../../lib/description/Detailed";
import { PersistableMixin } from "../../lib/persistence/Persistable";
import { PostRegistrationMixin } from "../../lib/stuff/PostRegistration";
import { FixtureMixin } from "../../lib/stuff/Fixture";
import { HeldGoodsMixin } from "../../lib/retail/Consignment";
import { MqlApi } from "../../api/mql";
import { MixinApi } from "../../api/mixin";
import type { CommandContext, CommandContributions } from "../../api/command";
import type { FieldMeta } from "../../lib/mixin";
import type { Stuff } from "../../lib/stuff/Stuff";
import type { Container } from "../../lib/spatial/Container";
import type { HeldGoodsShelf } from "../../lib/retail/Consignment";

/** A pure custody rack (the coat check) — the held-goods base, no sale. */
export type RackStuff = Stuff & Container & HeldGoodsShelf;

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

  /**
   * Resolve the check rack a `check` works off — a **pure custody** rack
   * (a `HeldGoodsShelf` that is not a sale shelf), by the command source
   * first (the fixture that afforded the verb), else a reachable peer.
   */
  static resolveIn(context: CommandContext): RackStuff | null {
    const isRack = (s: Stuff): boolean =>
      MixinApi.isHeldGoodsShelf(s) && !MixinApi.isConsignmentShelf(s);
    const source = context.commandSource;
    if (source && isRack(source)) return source as RackStuff;
    const peers = MqlApi.resolveMany("peers", {
      commandGiver: context.commandGiver,
      scope: "reachable",
    });
    return (peers.stuff.find(isRack) as RackStuff | undefined) ?? null;
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
