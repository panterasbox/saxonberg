/**
 * Scraper — the horse- or hand-drawn scraper that clears snow off the ice
 * so it freezes black (storage-and-ice D19). Affords `scrape`; a row says
 * how much ice one pass clears (`sweepM2`).
 */

import Tool from '@saxonberg/server/mud/platform/thing/Tool';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';

const SCRAPE = ['trade/ice/cmd/ice/scrape.yaml'];

export default class Scraper extends Tool {
  static fieldMeta: FieldMeta = {
    sweepM2: { persistent: true, authorable: true },
  };

  static commandContributions: CommandContributions = {
    environment: SCRAPE,
    peers: SCRAPE,
  };

  /** Square metres one pass clears. */
  public sweepM2 = 4;

  public getSweepM2(): number {
    return this.sweepM2 > 0 ? this.sweepM2 : 4;
  }
}
