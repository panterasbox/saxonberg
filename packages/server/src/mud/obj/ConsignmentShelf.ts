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

import { Vessel } from "../lib/stuff/Vessel";
import { DetailedMixin } from "../lib/description/Detailed";
import { PersistableMixin } from "../lib/persistence/Persistable";
import { PostRegistrationMixin } from "../lib/stuff/PostRegistration";
import { ConsignmentShelfMixin } from "../lib/retail/Consignment";
import { MqlApi } from "../api/mql";
import type { CommandContext, CommandContributions } from "../api/command";
import type { FieldMeta } from "../lib/mixin";

const ConsignmentShelfBase = PersistableMixin(
  ConsignmentShelfMixin(PostRegistrationMixin(DetailedMixin(Vessel))),
);

export default class ConsignmentShelf extends ConsignmentShelfBase {
  static fieldMeta: FieldMeta = {};

  /** Resolve the consignment shelf a `consign`/`reclaim`/`buy` works off. */
  static resolveIn(context: CommandContext): ConsignmentShelf | null {
    const source = context.commandSource;
    if (source instanceof ConsignmentShelf) return source;
    const peers = MqlApi.resolveMany("peers", {
      commandGiver: context.commandGiver,
      scope: "reachable",
    });
    return (
      peers.stuff.find((s): s is ConsignmentShelf => s instanceof ConsignmentShelf) ??
      null
    );
  }

  static commandContributions: CommandContributions = {
    self: [],
    environment: ["retail/consign.yaml", "retail/reclaim.yaml", "retail/buy.yaml"],
    inventory: ["retail/consign.yaml", "retail/reclaim.yaml"],
    peers: [],
  };
}
