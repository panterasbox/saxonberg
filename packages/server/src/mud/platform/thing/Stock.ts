/**
 * Stock — the shopkeeper's counter, the instanceable twin over the
 * kernel's mechanism (`lib/retail/Stock.ts`). It adds exactly one thing:
 * the affordance statics, because a verb lives with the thing that
 * affords it.
 *
 * ⚠ This twin is on its way out of the kernel. The counter is a
 * *vocation's* instrument and ships in `/trade/shopkeeping`; the
 * mechanism stays in `lib/` because the kernel reads it. See
 * `docs/subsystems/retail.md § The kernel/pack line`.
 */

import StockBase from "../../lib/retail/Stock";
import type { CommandContributions } from "../../api/command";

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
