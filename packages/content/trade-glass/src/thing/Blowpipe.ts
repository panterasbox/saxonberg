/**
 * Blowpipe — the glassmaker's iron: a `Tool` that HOLDS one gather
 * (`ContainerMixin`). It affords the hot shop (`dip`/`shape`/`reheat`/
 * `crack`) to whoever holds it — the affordance static lands in W5 with
 * those views. The capability `blowpipe` is authored on the row and is
 * what the `dip`/`shape`/`reheat`/`crack` views bind their `pipe` arg to.
 */

import Tool from "@saxonberg/server/mud/platform/thing/Tool";
import { ContainerMixin } from "@saxonberg/server/mud/lib/spatial/Container";
import type { CommandContributions } from "@saxonberg/server/mud/api/command";

const HOT_SHOP = [
  "trade/glass/cmd/glass/dip.yaml",
  "trade/glass/cmd/glass/shape.yaml",
  "trade/glass/cmd/glass/reheat.yaml",
  "trade/glass/cmd/glass/crack.yaml",
];

export default class Blowpipe extends ContainerMixin(Tool) {
  // ⭐ A verb an object affords is a static on the class — the pipe
  // affords the hot shop to whoever holds it (environment = the carrier).
  static commandContributions: CommandContributions = {
    environment: HOT_SHOP,
  };
}

