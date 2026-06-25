/**
 * Position — one held conviction stake, one document per
 * `{subject, stock, target}` in the `positions` collection.
 *
 * The **spend** half of influence (renown / participation / producer are the
 * earn half). A holder commits standing toward a target (a bill / question);
 * the weight that commitment carries is NOT stored — it is **derived on
 * read** from how long the position has been held unbroken
 * (`convictionFraction = clamp01((now − realSince) / buildPeriod)`, a linear
 * ramp). So no stored number is authoritative: conviction rewards sustained
 * commitment, and a flip restarts the clock (resets `realSince`); a drop
 * deletes the row.
 *
 * `subject` is the holder's durable `templatePath` — the SAME key
 * `InfluenceApi.standingOf(subject, stock)` reads, so the tally can weigh
 * each position by its holder's current standing. `stock` partitions
 * positions: conviction is **non-fungible** across stocks (a consumer stake
 * and a producer stake on the same target are distinct rows, tallied
 * separately). `yea` / `nay` are the holder's allocated split (full support
 * is `{yea:1, nay:0}`); the tally weighs the net `(yea − nay)`.
 */

import { Document } from '../persistence/Document';
import { Collections } from '../../../backend/PersistenceManager';
import type { Stock } from './InfluenceStanding';

/**
 * A read view of a held position: its stored split plus the **derived**
 * conviction ramp fraction at the query time (`ConvictionApi.positionOf`).
 */
export interface ConvictionPosition {
  subject: string;
  stock: Stock;
  target: string;
  yea: number;
  nay: number;
  /** The linear ramp fraction (0..1) at the query time. */
  conviction: number;
}

export default class Position extends Document {
  static collectionName = Collections.Positions;
  static persistentFields = [
    'subject',
    'stock',
    'target',
    'yea',
    'nay',
    'since',
    'realSince',
  ];

  /** Holder's durable id (the standing key) — indexed with stock + target. */
  subject = '';
  /** Which influence stock this stake spends (non-fungible across stocks). */
  stock: Stock = 'consumer';
  /** The target of the conviction (a bill / question id). */
  target = '';
  /** Allocated support weight (the net direction is `yea − nay`). */
  yea = 0;
  /** Allocated opposition weight. */
  nay = 0;
  /** Game-time SECONDS the position was (re)established — parity. */
  since = 0;
  /** Real-time epoch MS the position's conviction clock started (the ramp). */
  realSince = 0;
}
