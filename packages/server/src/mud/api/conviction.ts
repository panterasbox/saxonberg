/**
 * ConvictionApi — the spend half of influence: hold, flip, and tally
 * **conviction** stakes. A holder commits standing toward a target (a bill /
 * question); the weight that commitment carries is derived from how long it
 * has been held unbroken (a linear ramp), never stored — so conviction
 * rewards sustained commitment, and a flip restarts the clock.
 *
 * Three design commitments made structural here:
 *   - **Full weight, no pool** — `hold` never consults a holder's other
 *     targets; each position spends the holder's FULL standing scalar. This
 *     is not a budget to ration.
 *   - **Non-fungible** — positions partition by `stock`; the three stocks
 *     tally independently (the three-house model). A consumer stake and a
 *     producer stake on one target are distinct rows.
 *   - **Derived, not stored** — `positionOf` / `tally` recompute conviction
 *     from dwell time on every read; no stored weight is authoritative.
 *
 * **Present vs absent (quorum).** Holding *any* position — directional or an
 * **abstain** (`abstain`, a present net-zero stake) — counts as a vote cast:
 * `quorumWeight` sums the **full standing** of present holders
 * (conviction-independent), the participation numerator a passage rule
 * measures against the total possible. Not voting (no position) is absent and
 * counts for neither. So a heavyweight can abstain — counting for quorum
 * without forcing the outcome — while `tally` (the decision) still reads its
 * net as zero. Conviction scales only the decision weight, never quorum.
 *
 * No verb consumes this yet (the chambers / ballot are population-deferred);
 * this is the substrate + its tested clock seam. Every method takes an
 * optional `now` (real-time MS) defaulting to the wall clock — the seam tests
 * drive to exercise the ramp deterministically.
 *
 * Thin forwarding shell: the logic lives in the hot-reloadable
 * {@link ConvictionLogic} singleton at `/platform/idea/api/conviction`.
 */

import type { ConvictionPosition } from '../lib/standing/Position';
import { ConvictionTally } from '../lib/standing/ConvictionTally';
import type { Stock } from '../lib/standing/InfluenceStanding';
import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { ConvictionLogic } from '../platform/idea/api/ConvictionLogic';
import { fileURLToPath } from 'url';
import { SecurityApi } from './security';

export type { ConvictionPosition };
export { ConvictionTally };

const LOGIC_PATH = '/platform/idea/api/conviction';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../platform/idea/api/ConvictionLogic', import.meta.url)
);

/** Resolve the HMR-able ConvictionLogic singleton (sync). */
function logic(): ConvictionLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'ConvictionLogic'
      ) as typeof ConvictionLogic | null) ?? ConvictionLogic)()
  );
}

export class ConvictionApi {
  /**
   * Establish or update a holder's position on `{stock, target}` with a
   * `{yea, nay}` split (full support is `{yea:1, nay:0}`). A new position, or
   * a net-direction flip, (re)starts the conviction clock; a same-direction
   * re-hold keeps building. `subject` is the holder's durable `templatePath`.
   */
  public static async hold(
    subject: string,
    stock: Stock,
    target: string,
    split: { yea: number; nay: number },
    now?: number
  ): Promise<void> {
    return logic().hold(subject, stock, target, split, now ?? Date.now());
  }

  /**
   * Abstain on `{stock, target}` — a present, net-zero position. Distinct
   * from {@link drop} (not voting / absent): an abstain counts toward quorum
   * at the holder's full standing (see {@link quorumWeight}) while
   * contributing 0 to the decision. Lets a heavyweight decline to take a
   * side without starving quorum.
   */
  public static async abstain(
    subject: string,
    stock: Stock,
    target: string,
    now?: number
  ): Promise<void> {
    return logic().abstain(subject, stock, target, now ?? Date.now());
  }

  /** Reverse a held position (swap yea/nay) and reset its conviction clock. */
  public static async flip(
    subject: string,
    stock: Stock,
    target: string,
    now?: number
  ): Promise<void> {
    return logic().flip(subject, stock, target, now ?? Date.now());
  }

  /** Drop a held position entirely (delete the row). */
  public static async drop(
    subject: string,
    stock: Stock,
    target: string
  ): Promise<void> {
    return logic().drop(subject, stock, target);
  }

  /**
   * Read a holder's position on `{stock, target}` with its derived
   * conviction ramp at `now`; `null` if none is held.
   */
  public static async positionOf(
    subject: string,
    stock: Stock,
    target: string,
    now?: number
  ): Promise<ConvictionPosition | null> {
    return logic().positionOf(subject, stock, target, now ?? Date.now());
  }

  /**
   * Tally held conviction on `{stock, target}` — the per-house bill number:
   * `Σ standingOf(holder, stock).scalar × conviction × (yea − nay)`.
   */
  public static async tally(
    stock: Stock,
    target: string,
    now?: number
  ): Promise<ConvictionTally> {
    return logic().tally(stock, target, now ?? Date.now());
  }

  /**
   * The quorum weight cast on `{stock, target}` — `Σ standingOf(holder,
   * stock).scalar` over every *present* position (directional or abstain).
   * The participation numerator a passage rule measures against the total
   * possible. Conviction-independent and undirected: showing up counts at
   * full standing; not voting (no position) does not.
   */
  public static async quorumWeight(
    stock: Stock,
    target: string
  ): Promise<number> {
    return logic().quorumWeight(stock, target);
  }
}

SecurityApi.decorateApiClass(ConvictionApi);
