/**
 * ConvictionTally — the immutable result of summing held conviction on one
 * `{stock, target}`: the per-house bill number.
 *
 * `value = Σ standingOf(holder, stock).scalar × convictionFraction(position)
 * × (yea − nay)` over every position on the target. **Full weight, no pool**
 * — each position spends its holder's FULL standing scalar (a holder does
 * not divide their weight across the targets they hold), so this is not a
 * budget. **Non-fungible** — only positions of the named `stock` count; the
 * three stocks tally independently (the three-house model).
 *
 * Host-internal magnitude (reserved for the eventual ballot); no band, no
 * player-facing surface yet — there is no conviction verb this build.
 */

import type { Stock } from './InfluenceStanding';

export class ConvictionTally {
  constructor(
    public readonly stock: Stock,
    public readonly target: string,
    /** The signed weighted sum (positive = net support). */
    public readonly value: number,
    /** How many positions contributed (held on this target, this stock). */
    public readonly count: number
  ) {}
}
