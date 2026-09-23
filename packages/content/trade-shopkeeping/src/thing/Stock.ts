/**
 * Stock — the shopkeeper's counter, the instanceable twin over the
 * kernel's mechanism (`lib/retail/Stock.ts`). It adds exactly one thing:
 * the affordance statics, because a verb lives with the thing that
 * affords it.
 *
 * ⭐ The counter is a *vocation's* instrument, so the class a row names
 * ships here. The mechanism stays kernel substrate because the kernel
 * reads it — the price index, the credit ladder's rung 0, the wage
 * engine's par read and four controllers all narrow on the base, and a
 * kernel module may never import a pack. See
 * `docs/subsystems/retail.md § The kernel/pack line` and `lint:counters`.
 */

import StockBase from "@saxonberg/server/mud/lib/retail/Stock";
import type { CommandContributions } from "@saxonberg/server/mud/api/command";

export default class Stock extends StockBase {
  // A Stock counter is a consignment shelf too (libations 3a: one counter
  // is both), so it affords the shelf's verbs — a floor hand at the
  // cash-and-carry `consign`s onto it; the mixin's own static table is
  // not inherited through composition.
  static commandContributions: CommandContributions = {
    self: [],
    peers: [
      "platform/cmd/retail/buy.yaml",
      "platform/cmd/retail/consign.yaml",
      "platform/cmd/retail/reclaim.yaml",
    ],
    environment: [
      "platform/cmd/retail/buy.yaml",
      "platform/cmd/retail/consign.yaml",
      "platform/cmd/retail/reclaim.yaml",
    ],
  };
}
