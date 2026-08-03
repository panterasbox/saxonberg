/**
 * Census — how much of a thing is in circulation, by region.
 *
 * ## The semantics, stated rather than apologized for
 *
 * > **Circulation = what is reachable in the world now.** A wand in a
 * > logged-off player's pack is a *withdrawal* from circulation until
 * > they log in, and re-enters when they do.
 *
 * That is the discovery slate's own stock model (accumulation minus
 * withdrawal), and it is the right quantity for the decision being made:
 * both injection channels place into *live* regions, so the thing they
 * must not over-fill is live regional stock.
 *
 * It is worth being explicit because the alternative looks tempting and
 * is worse. There is a real population of items that exist, are owned,
 * and are invisible to a live scan — everything parked in
 * `holder_snapshots` behind the persistence spine, plus every logged-off
 * avatar's pack. Counting those would mean reaching into persistence,
 * and `holder_snapshots` rows are **per-mixin capture blobs, not an item
 * index**: counting from them needs a new index plus a write-path
 * obligation on every item move. Meanwhile the snapshot-parked tail is
 * self-correcting and bounded — a captured holder re-materializes on
 * first reference, so a transient undercount costs at most one extra
 * spawn per sweep, which D30 already declares tolerable.
 *
 * Eviction destroying (rather than unloading) is what makes the live
 * count need no correction for the cull path at all: `ResidencyLogic`
 * culls with `StuffApi.destruct`, and an evicted object is simply gone.
 *
 * ## ⚠ Why this is an MQL query and not a registry walk
 *
 * `scripts/check-world-scan.ts` is CI-gating and allowlists exactly
 * three files for the raw registry enumeration. This is not one of them,
 * and should not become one: the sanctioned engine-sweep form is a
 * **system-mode MQL query**, which is what this is. If profiling ever
 * shows it too costly, the fallback is to fold the count into
 * `ResidencyLogic`'s existing sweep — already allowlisted, already
 * walking every object once — and cache per-region per-sweep. Start
 * here: no allowlist edit, no new exception.
 *
 * ## Authored placement COUNTS and SPENDS nothing (D30)
 *
 * `S* = inflow/d` assumes ONE inflow. Deliberate placement is a second,
 * unmetered one, so an author placing twenty wands would silently push
 * the world past target with the algorithm none the wiser. The census
 * counts **every item in circulation regardless of how it got there**,
 * and both channels back off when regional stock is at target.
 *
 * **No allocation, no budget, no new economy.** An allocation would be a
 * new resource needing an owner, a ledger, and administration — and the
 * corrective already exists: **decay**. An over-filled area becomes an
 * area full of dead shells, which D7 establishes are harmless. An author
 * who floods deliberately and repeatedly is a content-review problem,
 * which is where it belongs.
 *
 * The census binds at **the scope the spawn decision is made** —
 * regional, not global. A global census would let one author's hoard
 * starve the world; global stock drives only the slow decay-side
 * equilibrium.
 */

import type { Stuff } from '../stuff/Stuff';
import { MqlApi } from '../../api/mql';
import { MixinApi } from '../../api/mixin';
import { ZoneApi } from '../../api/zone';

/** One region's stock, keyed by census key. */
export type RegionCensus = ReadonlyMap<string, number>;

/** The whole world's stock: region → (census key → count). */
export type WorldCensus = ReadonlyMap<string, RegionCensus>;

/** The region an item with no resolvable zone counts in. */
const UNPLACED_REGION = '';

export class Census {
  /**
   * **One pass over live circulating stock**, bucketed by region and
   * census key.
   *
   * Computed **once per sweep** and passed to both channels — never
   * per candidate. That is the difference between one query and one
   * query per spawn decision, and it is the whole of the cost note in
   * the plan's risk register.
   */
  public static async takeCensus(): Promise<WorldCensus> {
    // The system-mode seed: the declarative form of a getAllObjects
    // filter-loop, and the sanctioned one.
    const matches = MqlApi.resolveMany('world:[mixin.CirculatingMixin]', {
      commandGiver: null,
      scope: 'world',
    });

    const world = new Map<string, Map<string, number>>();
    for (const stuff of matches.stuff) {
      if (!MixinApi.isCirculating(stuff)) continue;
      const key = stuff.getCensusKey();
      if (key.length === 0) continue; // uncounted by its own declaration
      const region = await Census.regionOf(stuff);
      let bucket = world.get(region);
      if (!bucket) {
        bucket = new Map<string, number>();
        world.set(region, bucket);
      }
      // A stack counts as its quantity, not as one thing: twenty
      // potions in one stack are twenty potions on the shelf.
      const n = MixinApi.isGlobbable(stuff) ? stuff.getQuantity() : 1;
      bucket.set(key, (bucket.get(key) ?? 0) + n);
    }
    return world;
  }

  /**
   * The region an item counts in — its **zone**, which is the coarsest
   * grain the world already keeps books on and therefore the one an
   * author reasons in. An item with no resolvable zone counts in the
   * unplaced region rather than being dropped: uncounted stock is worse
   * than miscounted stock, because it is invisible to the backoff.
   */
  public static async regionOf(stuff: Stuff): Promise<string> {
    const path =
      (MixinApi.isContainable(stuff)
        ? (stuff.getContainer()?.getTemplatePath() ?? null)
        : null) ?? stuff.getTemplatePath();
    if (!path) return UNPLACED_REGION;
    try {
      const zone = await ZoneApi.resolveZoneForPath(path);
      return zone?.getTemplatePath() ?? UNPLACED_REGION;
    } catch {
      return UNPLACED_REGION;
    }
  }

  /** The count of `censusKey` in `region`, from a taken census. */
  public static countIn(
    census: WorldCensus,
    region: string,
    censusKey: string,
  ): number {
    return census.get(region)?.get(censusKey) ?? 0;
  }

  /**
   * **Is this region at or above target for this key?** The one question
   * both injection channels ask, and the reason neither needs to know
   * anything about the other.
   */
  public static isAtTarget(
    census: WorldCensus,
    region: string,
    censusKey: string,
    target: number,
  ): boolean {
    return Census.countIn(census, region, censusKey) >= target;
  }
}
