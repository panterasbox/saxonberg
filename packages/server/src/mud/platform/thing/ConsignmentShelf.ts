/**
 * ConsignmentShelf — the store's brokerage shelf: a **persistable**
 * container fixture that holds player-owned goods in custody (their
 * owner-stamps stay with the consignors) and the listing registry
 * (`ConsignmentShelfMixin`).
 *
 * `PersistableMixin` is composed outermost and is **load-bearing**: it is
 * what captures the consigned goods + their `_chattelId`s into a durable
 * record, so a consigned player-owned good survives a relog / server bounce
 * while in the shop's custody (a transient shelf would drop it). The shelf
 * affords `consign` / `reclaim` and — so listings can be bought where they
 * sit — `buy`.
 */

import { Vessel } from "../../lib/stuff/Vessel";
import { DetailedMixin } from "../../lib/description/Detailed";
import { PersistableMixin } from "../../lib/persistence/Persistable";
import { PostRegistrationMixin } from "../../lib/stuff/PostRegistration";
import { ConsignmentShelfMixin } from "../../lib/retail/Consignment";
import { MqlApi } from "../../api/mql";
import { MixinApi } from "../../api/mixin";
import type { CommandContext, CommandContributions } from "../../api/command";
import type { FieldMeta } from "../../lib/mixin";
import type { Stuff } from "../../lib/stuff/Stuff";
import type { Container } from "../../lib/spatial/Container";
import type { ConsignmentShelf as ConsignmentShelfSurface } from "../../lib/retail/Consignment";

/** Any fixture that brokers listings — this class, or a `Stock` counter. */
export type ShelfStuff = Stuff & Container & ConsignmentShelfSurface;

const ConsignmentShelfBase = PersistableMixin(
  ConsignmentShelfMixin(PostRegistrationMixin(DetailedMixin(Vessel))),
);

export default class ConsignmentShelf extends ConsignmentShelfBase {
  static fieldMeta: FieldMeta = {};

  /**
   * Resolve the brokerage shelf a `consign`/`reclaim`/`buy` works off —
   * by MIXIN, not class: a `Stock` counter composes the shelf too (one
   * counter is both), so the verbs resolve whichever fixture is here.
   */
  static resolveIn(context: CommandContext): ShelfStuff | null {
    const source = context.commandSource;
    if (source && MixinApi.isConsignmentShelf(source)) return source as ShelfStuff;
    const peers = MqlApi.resolveMany("peers", {
      commandGiver: context.commandGiver,
      scope: "reachable",
    });
    return (
      (peers.stuff.find((s) => MixinApi.isConsignmentShelf(s)) as ShelfStuff | undefined) ??
      null
    );
  }

  static commandContributions: CommandContributions = {
    self: [],
    peers: ["platform/cmd/retail/consign.yaml", "platform/cmd/retail/reclaim.yaml", "platform/cmd/retail/buy.yaml"],
    environment: ["platform/cmd/retail/consign.yaml", "platform/cmd/retail/reclaim.yaml"],
  };
}
