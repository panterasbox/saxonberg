/**
 * InfluenceApi — the common, cross-stock layer of the influence substrate:
 * a thin, stock-parameterized dispatcher over the per-stock Apis, plus the
 * shared `InfluenceStanding` / `Band` output shape.
 *
 * The three-stock contract made structural. `standingOf(subject, stock)`
 * delegates by stock to the stock's home — today only `'consumer'`
 * (→ {@link ConsumerApi}); `'patron'` and `'producer'` are reserved values
 * (their faucets are the Twitch and CMS/AOP builds) and return a defined
 * **zero standing** tagged with that stock, never a throw. The symmetry
 * lives here at the standing/band layer; the asymmetry (each stock's faucet
 * and formula) stays in the stock's own Api — patron is `concave($)`, not
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
import { SecurityApi } from './security';

export type { Stock };

export class InfluenceApi {
  /**
   * A subject's measured standing in `stock`, carrying the `stock` tag and
   * its band. `'consumer'` delegates to {@link ConsumerApi}, `'producer'` to
   * {@link ProducerApi}; the still-reserved `'patron'` stock returns a
   * defined zero standing tagged with that stock.
   */
  public static standingOf(subjectId: string, stock: Stock): InfluenceStanding {
    if (stock === 'consumer') return ConsumerApi.standingOf(subjectId);
    if (stock === 'producer') return ProducerApi.standingOf(subjectId);
    return InfluenceStanding.zero(subjectId, stock);
  }

  /** The band a subject sits in for `stock` (the player-facing surface). */
  public static bandOf(subjectId: string, stock: Stock): Band {
    return InfluenceApi.standingOf(subjectId, stock).band;
  }
}

SecurityApi.decorateApiClass(InfluenceApi);
