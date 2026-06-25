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
 * No verb consumes this yet (the chambers / ballot are population-deferred);
 * this is the substrate + its tested clock seam. Every method takes an
 * optional `now` (real-time MS) defaulting to the wall clock — the seam tests
 * drive to exercise the ramp deterministically.
 *
 * Thin forwarding shell: the logic lives in the hot-reloadable
 * {@link ConvictionLogic} singleton at `/obj/api/conviction`.
 */

import type { ConvictionPosition } from '../lib/standing/Position';
import { ConvictionTally } from '../lib/standing/ConvictionTally';
import type { Stock } from '../lib/standing/InfluenceStanding';
import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { SecurityApi } from './security';
import { ConvictionLogic } from '../obj/api/ConvictionLogic';
import { fileURLToPath } from 'url';

export type { ConvictionPosition };
export { ConvictionTally };

const LOGIC_PATH = '/obj/api/conviction';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../obj/api/ConvictionLogic', import.meta.url)
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
}

SecurityApi.decorateApiClass(ConvictionApi);
