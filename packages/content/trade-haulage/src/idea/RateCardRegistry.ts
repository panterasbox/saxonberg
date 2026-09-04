/**
 * RateCardRegistry — a carrier's **published prices**.
 *
 * > **Rates must be visible and settable.** Visible, because rate
 * > discrimination is the antitrust arc's evidence and must be a table
 * > rather than an accusation. Settable, because a carrier that cannot
 * > choose its prices cannot be the villain of that arc.
 *
 * Both halves are structural here. A card is a `rate-card` document
 * under the carrier's own branch, so publishing one is the carrier's act
 * and nobody else's; and reading one is `DocumentApi.read` on a path
 * anybody can name, so **a stranger can price a route without asking
 * anyone's permission** (AC12).
 *
 * ## ⚠ Two pricing mechanisms, and they are not the same act
 *
 * They coexist, they price **different acts**, and saying so here is
 * cheaper than letting a later reader try to unify them:
 *
 * | | who names the price | the act |
 * |---|---|---|
 * | **the rate card** | the CARRIER, in advance | you tender goods at a common carrier's counter and pay what the table says |
 * | **the gig board** | the SHIPPER, per job | you hire somebody directly, and the reward is a reverse auction |
 *
 * Both are real and both are historical. A common carrier posts a tariff
 * and serves all comers at it; a shipper who wants something moved today
 * posts what they will pay. Neither is a degenerate case of the other.
 *
 * ## Why a new card never overwrites the old one
 *
 * `rate-card` is `onVanish: 'keep'` and each publication writes its own
 * path. **A superseded card is exactly the row an antitrust argument
 * needs** — what did they charge me last season, and what did they
 * charge him?
 *
 * See [docs/subsystems/logistics.md].
 */

import { Idea } from '@saxonberg/server/mud/lib/stuff/Idea';
import { DocumentApi } from '@saxonberg/server/mud/api/document';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Business } from '@saxonberg/server/mud/platform/idea/Business';
import type { EvictionContext } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { VetoResult } from '@saxonberg/server/mud/lib/errors';

/** The platform's document kind for a published card. */
export const RATE_CARD_KIND = 'rate-card';

/** The branch under a business where its cards live. */
const CARDS_DIR = 'rate-cards';

/**
 * One line of a card: what it costs to move a commodity over a route.
 *
 * ⭐ `route × weight × commodity` — the three axes a real tariff has, and
 * the three a rate-discrimination argument is made over. A carrier that
 * charges one shipper more than another **on the same line** is doing
 * something a table can show.
 */
export interface RateLine {
  /** Durable location paths. `''` on either end means "anywhere". */
  from: string;
  to: string;
  /**
   * The commodity class this line prices — a free string an author picks
   * (`ore`, `spirits`, `general`). `''` is the catch-all line.
   */
  commodity: string;
  /** Minor units per kilogram carried. */
  perKgMinor: number;
  /** Minor units charged whatever the weight — the handling fee. */
  minimumMinor: number;
}

/** A published card, as it round-trips through the document store. */
export interface RateCard {
  cardId: string;
  /** The carrier's own durable path. */
  carrier: string;
  /** Game-seconds when it was published. Newest card wins a lookup. */
  publishedAtS: number;
  lines: RateLine[];
}

export default class RateCardRegistry extends Idea {
  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: 'system singleton; never culled' };
  }

  public canDestruct(): VetoResult {
    return {
      ok: false,
      reason:
        'RateCardRegistry is a system singleton and cannot be destructed',
    };
  }

  /**
   * Publish a card. **Settable**: prices are the carrier's own stance.
   *
   * ⚠ It never overwrites: a superseded card keeps its path, because a
   * price somebody was charged last season is evidence.
   */
  public async publish(
    carrier: Stuff & Business,
    lines: readonly RateLine[],
    cardId?: string,
  ): Promise<string> {
    const carrierPath = carrier.getTemplatePath() ?? '';
    if (carrierPath === '') {
      throw new Error(
        'RateCardRegistry.publish: the carrier has no durable path',
      );
    }
    if (lines.length === 0) {
      throw new Error(
        'RateCardRegistry.publish: a card with no lines prices nothing — ' +
          'refusing rather than publishing an empty tariff',
      );
    }
    for (const line of lines) {
      if (!(line.perKgMinor >= 0) || !(line.minimumMinor >= 0)) {
        throw new Error(
          'RateCardRegistry.publish: a rate line cannot be negative',
        );
      }
    }
    const nowS = WorldClockApi.getNow().rawValue();
    const id = cardId ?? `card-${nowS}`;
    const record: RateCard = {
      cardId: id,
      carrier: carrierPath,
      publishedAtS: nowS,
      lines: lines.map((l) => ({ ...l })),
    };
    const path = `${carrierPath}/${CARDS_DIR}/${id}`;
    await DocumentApi.saveAsBusiness(
      carrier,
      path,
      RATE_CARD_KIND,
      record as unknown as Record<string, unknown>,
    );
    return path;
  }

  /**
   * Every card a carrier has published, newest first.
   *
   * ⭐ **Visible, and to anybody.** `DocumentApi.read` is an ordinary
   * read on a path a stranger can name — no employment check, no
   * membership, no counter to stand at. That is what makes rate
   * discrimination *a table rather than an accusation*.
   */
  public async cardsOf(carrier: Stuff & Business): Promise<RateCard[]> {
    const carrierPath = carrier.getTemplatePath() ?? '';
    if (carrierPath === '') return [];
    const docs = await DocumentApi.list(`${carrierPath}/${CARDS_DIR}`);
    return docs
      .map((d) => cardOf(d.getData()))
      .filter((c): c is RateCard => c !== null)
      .sort((a, b) => b.publishedAtS - a.publishedAtS);
  }

  /** The carrier's current card, or `null` if it has published none. */
  public async currentCard(
    carrier: Stuff & Business,
  ): Promise<RateCard | null> {
    return (await this.cardsOf(carrier))[0] ?? null;
  }

  /**
   * What the current card says a shipment costs, in minor units, or
   * `null` when nothing on it covers the route.
   *
   * Line selection is **most specific first**: a line naming both ends
   * beats one naming an end, which beats the catch-all — the way a real
   * tariff is read.
   */
  public async quote(
    carrier: Stuff & Business,
    from: string,
    to: string,
    commodity: string,
    kg: number,
  ): Promise<number | null> {
    const card = await this.currentCard(carrier);
    if (!card) return null;
    const line = RateCardRegistry.bestLine(card, from, to, commodity);
    if (!line) return null;
    return Math.max(
      line.minimumMinor,
      Math.round(line.perKgMinor * Math.max(0, kg)),
    );
  }

  /** See {@link RateCardRegistry.quote} — the selection rule, exposed for a reader. */
  public static bestLine(
    card: RateCard,
    from: string,
    to: string,
    commodity: string,
  ): RateLine | null {
    const score = (l: RateLine): number => {
      if (l.from !== '' && l.from !== from) return -1;
      if (l.to !== '' && l.to !== to) return -1;
      if (l.commodity !== '' && l.commodity !== commodity) return -1;
      return (
        (l.from !== '' ? 1 : 0) +
        (l.to !== '' ? 1 : 0) +
        (l.commodity !== '' ? 1 : 0)
      );
    };
    let best: RateLine | null = null;
    let bestScore = -1;
    for (const line of card.lines) {
      const s = score(line);
      if (s > bestScore) {
        best = line;
        bestScore = s;
      }
    }
    return bestScore >= 0 ? best : null;
  }
}

function cardOf(data: Record<string, unknown>): RateCard | null {
  if (typeof data.cardId !== 'string' || data.cardId === '') return null;
  const lines = Array.isArray(data.lines) ? data.lines : [];
  return {
    cardId: data.cardId,
    carrier: String(data.carrier ?? ''),
    publishedAtS: Number(data.publishedAtS ?? 0),
    lines: lines
      .filter((l): l is Record<string, unknown> => !!l && typeof l === 'object')
      .map((l) => ({
        from: String(l.from ?? ''),
        to: String(l.to ?? ''),
        commodity: String(l.commodity ?? ''),
        perKgMinor: Number(l.perKgMinor ?? 0),
        minimumMinor: Number(l.minimumMinor ?? 0),
      })),
  };
}
