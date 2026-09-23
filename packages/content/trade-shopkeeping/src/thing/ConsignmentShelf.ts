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

import { Vessel } from "@saxonberg/server/mud/lib/stuff/Vessel";
import { DetailedMixin } from "@saxonberg/server/mud/lib/description/Detailed";
import { PersistableMixin } from "@saxonberg/server/mud/lib/persistence/Persistable";
import { PostRegistrationMixin } from "@saxonberg/server/mud/lib/stuff/PostRegistration";
import { ConsignmentShelfMixin } from "@saxonberg/server/mud/lib/retail/Consignment";
import type { CommandContributions } from "@saxonberg/server/mud/api/command";
import type { FieldMeta } from "@saxonberg/server/mud/lib/mixin";

const ConsignmentShelfBase = PersistableMixin(
  ConsignmentShelfMixin(PostRegistrationMixin(DetailedMixin(Vessel))),
);

export default class ConsignmentShelf extends ConsignmentShelfBase {
  static fieldMeta: FieldMeta = {};


  static commandContributions: CommandContributions = {
    self: [],
    peers: ["platform/cmd/retail/consign.yaml", "platform/cmd/retail/reclaim.yaml", "platform/cmd/retail/buy.yaml"],
    environment: ["platform/cmd/retail/consign.yaml", "platform/cmd/retail/reclaim.yaml"],
  };
}
