/**
 * BloodWindow — the registrar's counter at a blood bank (blood build D2):
 * a priced board (`Tariff`) that is ALSO a donation register
 * (`DonationBankMixin`). Pricing a transfusion and keeping the bank of
 * units it draws on are one fixture, because the fee attributes to
 * whoever operates this counter (`PricedOffer.collect` self-first) and the
 * bank reads its units out of the vault the row points `_vaultPaths` at.
 *
 * ⭐ A second blood window is a ROW of this class (its own Business, its
 * own vault); a second KIND of bank (a milk bank) is one small class of
 * its own in its trade, composing the same `DonationBankMixin`.
 *
 * Ships in `/trade/medicine/thing/BloodWindow` (the `Potion extends
 * Receptacle` precedent: a pack thing specializing a platform Thing).
 * `lint:counters` is satisfied — the kernel composer of `PricedOfferMixin`
 * is still only `Tariff`; this pack class composes it transitively, which
 * is where a vocation's counter is meant to live.
 */

import Tariff from '@saxonberg/server/mud/platform/thing/Tariff';
import { DonationBankMixin } from '@saxonberg/server/mud/lib/commerce/DonationBank';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';

const BloodWindowBase = DonationBankMixin(Tariff);

export default class BloodWindow extends BloodWindowBase {
  /**
   * The board's verbs. `getContributions` reads the most-derived static
   * (shadowing `Tariff`'s), so this re-lists the inherited menu/order and
   * adds the bank's `issue`/`donate`. Afforded to the room (`environment`)
   * and the giver's peers; the gate is the seat (`issue`) or the bag's
   * payload (`donate`), never the band.
   */
  static override commandContributions: CommandContributions = {
    self: [],
    peers: [
      'platform/cmd/retail/menu.yaml',
      'platform/cmd/retail/order.yaml',
      'trade/medicine/cmd/medical/issue.yaml',
      'trade/medicine/cmd/medical/donate.yaml',
    ],
    environment: [
      'platform/cmd/retail/menu.yaml',
      'platform/cmd/retail/order.yaml',
      'trade/medicine/cmd/medical/issue.yaml',
      'trade/medicine/cmd/medical/donate.yaml',
    ],
  };
}
