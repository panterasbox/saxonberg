/**
 * SpawnTable — the weighted draw, and the thing that declines.
 *
 * The random half of D31's two placement channels. Its whole job is to
 * pick *which* item, given that something is being placed at all — and
 * to say **no** when the region is already at target.
 *
 * ## The weights are not authored (AC 32)
 *
 * Each candidate's weight is `PriceList.spawnWeightFor(effectTags)` —
 * the inverse of the stored labour in the item. A cheap working is
 * common because it was cheap to make. There is no authored rarity
 * anywhere in the codebase, deliberately: an authored table would let
 * the economy and the physics disagree.
 *
 * **Material tags** weigh **place affinity** — a mine stocks metal, a
 * grove stocks wood — and that is a second, independent multiplier on
 * the same draw.
 *
 * ## Declining is the interesting behaviour
 *
 * `draw` returns `null` when every candidate's key is at target in that
 * region. That is how authored placement suppresses random spawning
 * **without either channel knowing about the other**: the author's
 * twenty wands are simply counted, the random channel sees the count,
 * and it backs off. No allocation, no budget, no coordination.
 *
 * And it backs off **regionally**, never globally (AC 34) — a hoard in
 * one zone must not starve the world.
 *
 * Pure apart from the census it is handed: no clock, no I/O, and the
 * randomness is injected so a test can drive it exactly.
 */

import { Census } from './Census';
import type { WorldCensus } from './Census';
import { PriceList } from '../magic/PriceList';
import type { ArcaneAddress } from '../magic/Arcane';

/** One thing the table could place. */
export interface SpawnCandidate {
  /** The template to clone. */
  readonly templatePath: string;
  /** Which stock bucket it counts in. */
  readonly censusKey: string;
  /** Its grid cells — weighs rarity through the price list. */
  readonly effectTags: readonly ArcaneAddress[];
  /** What it is made of — weighs place affinity. */
  readonly materialTags: readonly string[];
  /** How many of this key a region should hold. */
  readonly regionTarget: number;
  /**
   * The region the candidate is HOME to — the zone of the row's own
   * `container:` (a producer's Stock counter), so a floor bottle is drawn
   * for the region it will actually land in and nowhere else. Unset for
   * a candidate with no authored home: it may be drawn in any region.
   */
  readonly region?: string;
}

/** What a region prefers to stock, by material tag. */
export type PlaceAffinity = ReadonlyMap<string, number>;

export class SpawnTable {
  /**
   * The weight a candidate draws with: **rarity × place affinity**.
   *
   * Rarity is derived (inverse stored labour); affinity multiplies it by
   * how well the region suits what the thing is made of. A candidate
   * whose materials the region has no opinion about weighs 1× — neutral,
   * not excluded.
   */
  public static weightFor(
    candidate: SpawnCandidate,
    affinity: PlaceAffinity = new Map(),
  ): number {
    const rarity = PriceList.spawnWeightFor(candidate.effectTags);
    let place = 1;
    for (const tag of candidate.materialTags) {
      const m = affinity.get(tag);
      if (typeof m === 'number' && m > 0) place *= m;
    }
    return rarity * place;
  }

  /**
   * **Draw one candidate, or decline.**
   *
   * Returns `null` when every candidate is at target in this region —
   * which is exactly how authored placement suppresses random spawning
   * without the two channels being aware of each other.
   *
   * `roll` is injected (default `Math.random`) so a test can pin the
   * draw rather than hoping. Callers inside the mudlib pass one; only
   * the default reaches for the global.
   */
  public static draw(
    candidates: readonly SpawnCandidate[],
    census: WorldCensus,
    region: string,
    opts: { affinity?: PlaceAffinity; roll?: () => number } = {},
  ): SpawnCandidate | null {
    const eligible = candidates.filter(
      (c) =>
        !Census.isAtTarget(census, region, c.censusKey, c.regionTarget),
    );
    if (eligible.length === 0) return null;

    const affinity = opts.affinity ?? new Map<string, number>();
    const weights = eligible.map((c) => SpawnTable.weightFor(c, affinity));
    const total = weights.reduce((a, b) => a + b, 0);
    if (total <= 0) return null;

    const roll = (opts.roll ?? Math.random)() * total;
    let running = 0;
    for (let i = 0; i < eligible.length; i++) {
      running += weights[i]!;
      if (roll < running) return eligible[i]!;
    }
    // Floating-point tail — the last eligible candidate is the honest
    // answer rather than a null nobody expected.
    return eligible[eligible.length - 1]!;
  }
}
