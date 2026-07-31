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
 *
 * **Present vs absent (the quorum distinction).** The *existence* of a row
 * means the holder **cast a vote** — it counts toward quorum (participation).
 * Absence of a row means **not voting** (absent), which does not. An
 * **abstain** is a present, net-zero position (`yea = nay = 0`): it counts
 * for quorum at the holder's full standing but contributes 0 to the
 * decision — so a founder with a supermajority can decline to take a side
 * without starving quorum. Quorum presence is **conviction-independent**
 * (you don't build conviction to show up); conviction scales only the
 * decision weight. See `ConvictionApi.quorumWeight` vs `tally`.
 */

import { Document } from '../persistence/Document';
import { Collections } from '../persistence/Collections';
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
