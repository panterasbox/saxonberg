/**
 * InfluenceApi — the common, cross-stock layer of the influence substrate:
 * a thin, stock-parameterized dispatcher over the per-stock Apis, plus the
 * shared `InfluenceStanding` / `Band` output shape.
 *
 * The three-stock contract made structural. `standingOf(subject, stock)`
 * delegates by stock to the stock's home — today only `'consumer'`
 * (→ {@link ConsumerApi}); `'capital'` and `'producer'` are reserved values
 * (their faucets are the Twitch and CMS/AOP builds) and return a defined
 * **zero standing** tagged with that stock, never a throw. The symmetry
 * lives here at the standing/band layer; the asymmetry (each stock's faucet
 * and formula) stays in the stock's own Api — capital is `concave($)`, not
 * `engagement × quality`, so no shared formula could fit.
 *
 * InfluenceApi owns no faucet and no logic singleton: the consumer
 * projection lives in `ConsumerLogic`; this is pure dispatch.
 */

import { ConsumerApi } from './consumer';
import { ProducerApi } from './producer';
import { InfluenceStanding } from '../lib/standing/InfluenceStanding';
import type { Stock } from '../lib/standing/InfluenceStanding';
import type { Band } from '../lib/standing/Band';
import type { Stuff } from '../lib/stuff/Stuff';
import { SecurityApi } from './security';

export type { Stock };

/**
 * Which *level* a stock measures at.
 *
 * From the seeding slate: **Make** (you build) and **Fund** (you pay)
 * are things the **person** does → account-level. **Play** accrues by
 * living in the world as one particular body → per-character, and is
 * the only standing that can legitimately diverge across an account's
 * characters.
 *
 * ⚠ This is **vocabulary, not arithmetic.** Declaring that producer is
 * account-level says nothing about how an account's figure is derived
 * from its characters' — that is an open design question (see
 * {@link InfluenceApi.standingForHost}).
 */
export type StandingLevel = 'account' | 'character';

/** The level each stock measures at. See {@link StandingLevel}. */
export const STOCK_LEVEL: Readonly<Record<Stock, StandingLevel>> = {
  consumer: 'character',
  producer: 'account',
  capital: 'account',
};

export class InfluenceApi {
  /**
   * A subject's measured standing in `stock`, carrying the `stock` tag and
   * its band. `'consumer'` delegates to {@link ConsumerApi}, `'producer'` to
   * {@link ProducerApi}; the still-reserved `'capital'` stock returns a
   * defined zero standing tagged with that stock.
   */
  public static standingOf(subjectId: string, stock: Stock): InfluenceStanding {
    if (stock === 'consumer') return ConsumerApi.standingOf(subjectId);
    if (stock === 'producer') return ProducerApi.standingOf(subjectId);
    return InfluenceStanding.zero(subjectId, stock);
  }

  /**
   * A **host's** standing in `stock` — the seam every player-facing
   * surface reads through, so `standing`, `profile` and the live
   * dashboard field cannot disagree.
   *
   * ⚠⚠ **THE ACCOUNT-LEVEL AGGREGATION IS A STUB. It does not
   * aggregate.** For an account-level stock this currently returns the
   * host's *own* subject standing — exactly what a character-level read
   * returns.
   *
   * That is deliberate. *How* an account's make standing derives from
   * its characters' — sum, best, decayed differently, something else
   * entirely — is an open design question and its own piece of work.
   * Committing to a formula here would ship a number players can see
   * that is derived from a placeholder, and every surface that read it
   * would encode the placeholder by reference.
   *
   * So the **shape** lands and the **arithmetic** does not:
   *
   *   - `STOCK_LEVEL` records which stocks are account-level;
   *   - this is the one function that will consult it;
   *   - all three read surfaces already call through here.
   *
   * When the standing design lands, exactly one function changes and
   * nothing downstream moves. Until then a producer standing is still
   * per-character, and **that is visible rather than pretended**.
   */
  public static standingForHost(host: Stuff, stock: Stock): InfluenceStanding {
    // The durable subject the faucets re-key storage to; the live
    // stuffId is re-minted on re-clone. Matches the faucet's own
    // fallback so the key always agrees.
    const subject = host.getTemplatePath() ?? host.stuffId;

    // ⚠⚠ STUB. `STOCK_LEVEL[stock]` says whether this figure measures
    // the account or the character — and this is the function that will
    // act on it. It does not yet: an account-level stock resolves to
    // the host's own subject, identical to a character-level one.
    //
    // Two things are missing and both are deliberate: the account →
    // characters resolution, and the formula that combines them. When
    // they land they land HERE, and every caller is already routed
    // through this function.
    return InfluenceApi.standingOf(subject, stock);
  }

  /** The band a subject sits in for `stock` (the player-facing surface). */
  public static bandOf(subjectId: string, stock: Stock): Band {
    return InfluenceApi.standingOf(subjectId, stock).band;
  }
}

SecurityApi.decorateApiClass(InfluenceApi);
