/**
 * ConsumerApi — the consumer influence stock's home: the gated append/read
 * surface for the **participation** faucet (the quantity axis) and the
 * **consumer standing** projection (`max(0, renownOf) × participationOf`).
 *
 * One of three sibling stock Apis under the common {@link InfluenceApi}
 * dispatcher (patron and producer join later). ConsumerApi OWNS the
 * participation log + standing and computes the consumer standing; it
 * READS `RenownApi` (the shared, general social-standing substrate) for the
 * quality half, never owning it.
 *
 * **Dumb store, smart consumer** (the renown precedent). The substrate
 * stores raw {@link ParticipationEvent} active-bucket rows — no score, no
 * decay — and aggregates them on a schedule; the value-function is applied
 * only at recompute, so re-legislating decay re-scores history without
 * rewriting a row. The standing is **rebuildable**: drop the aggregate,
 * replay the log, get identical standings.
 *
 * This Api is a thin forwarding shell: the logic lives in the
 * hot-reloadable {@link ConsumerLogic} singleton at `/obj/api/consumer`,
 * reached synchronously via `StuffApi.singletonSync`.
 */

import type ParticipationEvent from '../lib/standing/ParticipationEvent';
import type { ParticipationEventFields } from '../lib/standing/ParticipationEvent';
import type { InfluenceStanding } from '../lib/standing/InfluenceStanding';
import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { SecurityApi } from './security';
import { ConsumerLogic } from '../obj/api/ConsumerLogic';
import { fileURLToPath } from 'url';

export type { ParticipationEventFields };

const LOGIC_PATH = '/obj/api/consumer';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../obj/api/ConsumerLogic', import.meta.url)
);

/** Resolve the HMR-able ConsumerLogic singleton (sync). */
function logic(): ConsumerLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'ConsumerLogic'
      ) as typeof ConsumerLogic | null) ?? ConsumerLogic)()
  );
}

export class ConsumerApi {
  /**
   * Boot seam (idempotent): install the receive-gated command-dispatch →
   * participation tap and self-register the real-time recompute schedule.
   * The standing cache is warmed separately by `ParticipationStanding.warm()`
   * (awaited in `AppBootstrap` before this, so the first reads are
   * populated).
   */
  public static boot(): void {
    logic().installDispatchTap();
    logic().installRecomputeSchedule();
  }

  /**
   * Append one raw active-bucket signal (find-or-skip on `{subject,
   * bucket}`). No-op without an active connection. The receive-gated
   * dispatch tap is the usual caller; exposed for tests and programmatic
   * crediting.
   */
  public static async append(fields: ParticipationEventFields): Promise<void> {
    return logic().append(fields);
  }

  /**
   * Re-score every subject's participation from the raw bucket log into the
   * materialized aggregate — the batch the recompute schedule fires (and
   * the `participationOf` cache is refreshed from).
   */
  public static async recompute(): Promise<void> {
    return logic().recompute();
  }

  /**
   * The sync cached read — a subject's recency-decayed participation
   * (quantity axis). Neutral 0 for a non-materialized subject.
   */
  public static participationOf(subjectId: string): number {
    return logic().participationOf(subjectId);
  }

  /**
   * The consumer-stock projection: `max(0, renownOf) × participationOf`,
   * banded, tagged `'consumer'`. Sync derive-on-read. `InfluenceApi`
   * delegates here for the `'consumer'` stock.
   */
  public static standingOf(subjectId: string): InfluenceStanding {
    return logic().standingOf(subjectId);
  }

  /** The raw, per-subject bucket-log reader — the unscored substrate seam. */
  public static async eventsFor(
    subjectId: string
  ): Promise<ParticipationEvent[]> {
    return logic().eventsFor(subjectId);
  }
}

SecurityApi.decorateApiClass(ConsumerApi);
