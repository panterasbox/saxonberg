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
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { ActOutcome, ActRefusal } from '@saxonberg/server/mud/lib/craft/ActPlan';
import type { Charge } from '@saxonberg/server/mud/lib/banking/Charge';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { BankingApi, Money } from '@saxonberg/server/mud/api/banking';

/** Why a pilot will not sell you the water — worded by `pilot`. */
export type PilotRefusal =
  | ActRefusal<'nothing-to-tell'>
  | ActRefusal<'cannot-pay', { fee: string }>;
/** What the buyer came away with: how many claims went into their map. */
export interface PilotTold {
  told: number;
}

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

  /**
   * ⭐ **Sell what this pilot knows of the water to `buyer`** (the `pilot`
   * verb's act). The CLAIMS are asked first and the coin second (C27): a
   * buyer who keeps no map, or a pilot with nothing charted, refuses
   * before anybody is charged — the fee was taken first once, and a
   * player paid for a shrug. Then the fee is settled in coin into the
   * pilot's own hands (the cash method), and the knowledge is written into
   * the buyer's map as `told` claims signed with the pilot's identity.
   * Nothing is checked against the water: a wrong pilot is wrong in your
   * map too.
   */
  public async sellWaterTo(buyer: Stuff): Promise<ActOutcome<PilotTold> | PilotRefusal> {
    if (!MixinApi.isCartographer(buyer) || !buyer.keepsMaps()) return { ok: false, reason: 'nothing-to-tell' };
    if (this.getOf() === '' || this.getEntries().length === 0) return { ok: false, reason: 'nothing-to-tell' };
    if (this.fee > 0) {
      const amount = Money.of(this.fee, BankingApi.compactCurrency());
      const charge: Charge = {
        amount,
        reason: "a pilot's fee",
        presented: true,
        payeeAccountId: '',
        payeeContainer: this as never,
      };
      try {
        await BankingApi.settle(charge, { kind: 'cash' });
      } catch {
        return { ok: false, reason: 'cannot-pay', facts: { fee: amount.render() } };
      }
    }
    const told = await this.writeClaimsFor(buyer, { by: this.getIdentityPath() ?? this.getTemplatePath() ?? '' });
    return { ok: true, facts: { told } };
  }
}
