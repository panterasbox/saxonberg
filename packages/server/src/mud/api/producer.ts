/**
 * ProducerApi — the producer influence stock's home: the gated append/read
 * surface for the **producer** faucet (the MAKE axis) and the producer
 * standing projection.
 *
 * One of three sibling stock Apis under the common {@link InfluenceApi}
 * dispatcher (consumer ships; patron is intake-gated). ProducerApi OWNS the
 * attributed-engagement log + standing and computes the producer standing.
 * Its formula is **engagement-only** — the decayed attributed-engagement
 * scalar, NOT `engagement × quality` (an author earns from *draw* on their
 * released content, not from being liked) — so it reads no `RenownApi`.
 *
 * **Dumb store, smart consumer** (the renown / participation precedent). The
 * substrate stores raw {@link ProducerEvent} attributed-bucket rows — no
 * score, no decay — and aggregates them on a schedule; the value-function is
 * applied only at recompute, so re-legislating decay re-scores history
 * without rewriting a row. The standing is **rebuildable**: drop the
 * aggregate, replay the log, get identical standings.
 *
 * This Api is a thin forwarding shell: the logic lives in the hot-reloadable
 * {@link ProducerLogic} singleton at `/obj/api/producer`, reached
 * synchronously via `StuffApi.singletonSync`.
 */

import type ProducerEvent from '../lib/standing/ProducerEvent';
import type { ProducerEventFields } from '../lib/standing/ProducerEvent';
import type { InfluenceStanding } from '../lib/standing/InfluenceStanding';
import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { SecurityApi } from './security';
import { ProducerLogic } from '../obj/api/ProducerLogic';
import { fileURLToPath } from 'url';

export type { ProducerEventFields };

const LOGIC_PATH = '/obj/api/producer';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../obj/api/ProducerLogic', import.meta.url)
);

/** Resolve the HMR-able ProducerLogic singleton (sync). */
function logic(): ProducerLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'ProducerLogic'
      ) as typeof ProducerLogic | null) ?? ProducerLogic)()
  );
}

export class ProducerApi {
  /**
   * Boot seam (idempotent): install the receive-gated command-dispatch →
   * producer engagement tap and self-register the real-time recompute
   * schedule. The standing cache is warmed separately by
   * `ProducerStanding.warm()` (awaited in `AppBootstrap` before this).
   */
  public static boot(): void {
    logic().installEngagementTap();
    logic().installRecomputeSchedule();
  }

  /**
   * Append one raw attributed-engagement signal (find-or-skip on `{author,
   * actor, bucket}`). No-op without an active connection. The engagement tap
   * is the eventual caller; exposed for tests and programmatic crediting.
   */
  public static async append(fields: ProducerEventFields): Promise<void> {
    return logic().append(fields);
  }

  /**
   * Re-score every author's production from the raw attributed-engagement
   * log into the materialized aggregate — the batch the recompute schedule
   * fires (and the `producerOf` cache is refreshed from).
   */
  public static async recompute(): Promise<void> {
    return logic().recompute();
  }

  /**
   * The sync cached read — an author's recency-decayed production scalar.
   * Neutral 0 for a non-materialized author. Keyed on the author's durable
   * `templatePath`.
   */
  public static producerOf(authorId: string): number {
    return logic().producerOf(authorId);
  }

  /**
   * The producer-stock projection: the decayed attributed-engagement scalar,
   * banded, tagged `'producer'`. Sync derive-on-read. `InfluenceApi`
   * delegates here for the `'producer'` stock.
   */
  public static standingOf(authorId: string): InfluenceStanding {
    return logic().standingOf(authorId);
  }

  /** The raw, per-author log reader — the unscored substrate seam. */
  public static async eventsFor(authorId: string): Promise<ProducerEvent[]> {
    return logic().eventsFor(authorId);
  }
}

SecurityApi.decorateApiClass(ProducerApi);
