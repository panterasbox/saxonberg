/**
 * Pilot — a person who knows one water, and sells what they know
 * (maritime D17).
 *
 * ⭐⭐ The pilot is CLAIMS, not a Discipline. You cannot study your way to
 * knowing a channel; you have to go there, and the channel keeps moving.
 * So hiring a pilot needs no employment system: you are BUYING CLAIMS —
 * `told` claims in your map, signed with the pilot's name — which is also
 * why they can be sold, and why they can be WRONG. A pilot who has the
 * Westerlies ten miles south of where they run tells you so, and your map
 * holds it, signed, after the water has disagreed.
 *
 * The knowledge is authored like a chart's (`ChartedMixin`: `of` the
 * expanse, `entries` as the pilot believes them). `fee` is in the realm's
 * minor units. Afforded `pilot` on `peers`: you pay the person standing
 * with you.
 */

import { Cast } from '@saxonberg/server/mud/platform/agent/Cast';
import { ChartedMixin } from '@saxonberg/server/mud/lib/expanse/Charted';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';

const PILOT_VIEW = ['system/water/cmd/social/pilot.yaml'];

export default class Pilot extends ChartedMixin(Cast) {
  static commandContributions: CommandContributions = {
    peers: PILOT_VIEW,
  };

  static fieldMeta: FieldMeta = {
    fee: { persistent: true, authorable: true },
  };

  /** What the pilot charges to tell you the water, in minor units. */
  protected fee = 0;

  public getFee(): number { return this.fee; }
  public setFee(v: number): void { this.fee = Math.max(0, Math.round(Number(v) || 0)); }
}
