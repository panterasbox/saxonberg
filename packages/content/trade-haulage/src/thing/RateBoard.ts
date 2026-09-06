/**
 * RateBoard — ⭐⭐ **the tariff on the wall, and the reason it is a Thing
 * rather than a verb.**
 *
 * > **Rates must be VISIBLE**, because rate discrimination is the
 * > antitrust arc's evidence and must be a table rather than an
 * > accusation.
 *
 * Visible to *whom* is the load-bearing part, and the answer has to be
 * **anybody**: a stranger with no employment, no membership and no
 * business of their own has to be able to price a route. So the surface
 * is not a verb on the carrier's books — `house` is your own books, and
 * would have been exactly the wrong shape — it is a **board you read**,
 * and reading is a thing everybody can already do.
 *
 * ⭐ Which also means a second carrier's board is a content row and no
 * code at all, and that two boards in one town can be compared by
 * standing between them. That is the antitrust arc's evidence, hung on
 * a wall.
 *
 * ⚠ The text is **derived on read**, never authored: an authored board
 * would drift from the card the moment a carrier republished, and a
 * tariff nobody can trust is worse than none. `MarkedMixin` supplies the
 * `read` affordance and the perception gate — a board in the dark is a
 * blank, which is correct — and this class overrides only where the
 * text comes from.
 */

import Thing from '@saxonberg/server/mud/platform/thing/Thing';
import { MarkedMixin } from '@saxonberg/server/mud/lib/description/Marked';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Business } from '@saxonberg/server/mud/platform/idea/Business';
import RateCardRegistry, { type RateCard } from '../idea/RateCardRegistry';

/** Where the trade's rate registry lives. */
export const RATE_CARD_REGISTRY_PATH = '/trade/haulage/idea/RateCardRegistry';

const RateBoardBase = MarkedMixin(Thing);

export default class RateBoard extends RateBoardBase {
  static fieldMeta: FieldMeta = {
    carrierPath: { persistent: true, authorable: true, authorPicker: 'Template' },
  };

  /** Whose tariff this board shows. */
  public carrierPath = '';

  public getCarrierPath(): string {
    return this.carrierPath;
  }
  public setCarrierPath(value: string): void {
    this.carrierPath = value;
  }

  /**
   * ⭐ The board's text, rendered from the carrier's CURRENT card.
   *
   * Async, so `read` gets a live tariff rather than a remembered one;
   * `refresh()` writes it into the `Marked` text the shipped verb reads,
   * and the board re-renders itself whenever anybody asks.
   */
  public async render(): Promise<string> {
    const carrier = await this.resolveCarrier();
    if (!carrier) {
      return 'The board is empty. Nobody is quoting from this counter.';
    }
    const registry = await StuffApi.singleton<RateCardRegistry>(
      RATE_CARD_REGISTRY_PATH,
    );
    const card = await registry.currentCard(carrier);
    if (!card) {
      return (
        'The frame is up and there is no card in it. Whatever they are ' +
        'charging, they have not said.'
      );
    }
    return RateBoard.renderCard(card);
  }

  /** Re-render and store, so the shipped `read` verb has text to show. */
  public async refresh(): Promise<string> {
    const text = await this.render();
    this.setMarkText(text);
    return text;
  }

  /** The tariff, as a table. */
  public static renderCard(card: RateCard): string {
    const lines = card.lines.map((l) => {
      const where =
        l.from === '' && l.to === ''
          ? 'anywhere'
          : `${leafOf(l.from) || 'anywhere'} → ${leafOf(l.to) || 'anywhere'}`;
      const what = l.commodity === '' ? 'any goods' : l.commodity;
      return `  ${where} · ${what} · ${l.perKgMinor}/kg, minimum ${l.minimumMinor}`;
    });
    return [
      'RATES — posted, and the same for everybody who reads them.',
      ...lines,
      '',
      'Rates are what the carrier says they are. If two of these look',
      'unlike each other for the same road, that is a fact about this',
      'carrier and not about the road.',
    ].join('\n');
  }

  private async resolveCarrier(): Promise<(Stuff & Business) | null> {
    if (this.carrierPath === '') return null;
    const biz = await StuffApi.singleton<Stuff>(this.carrierPath).catch(
      () => null,
    );
    return biz && MixinApi.isBusiness(biz) ? biz : null;
  }
}

/** The last path segment, for prose. */
function leafOf(path: string): string {
  if (path === '') return '';
  const leaf = path.split('/').filter(Boolean).pop() ?? path;
  return leaf.replace(/-/g, ' ');
}
