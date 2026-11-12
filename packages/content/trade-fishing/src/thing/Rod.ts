/**
 * Rod — the angling instrument. **The instrument affords the verb**: a
 * rod in your hands is what makes `fish`, `reel` and `slack` sayable, as
 * a static on the class and never a row key.
 *
 * One class, rows for the rungs. ⭐ **The rig is numbers on the rod,
 * coupled by the rows** (B8): `showing` (how well the tackle shows the
 * bait), `breakStrain` (the line test — where it parts), `presentsAt`
 * (where in the column the bait sits: a float holds it at the surface,
 * a free line drifts mid-water, a leger weight pins it to the bottom —
 * read against each species' `feedsAt`), and `hookGapeM` (the hook: a
 * fish much smaller than the gape cannot take it). A heavy rig holds
 * the sturgeon and shows more; a fine one bites more and parts. The
 * trade-off is authored, not coded. The rod's own state is nothing —
 * the wait lives on the engagement and the reach's fish in the water
 * pack's record.
 */

/** Where a rig puts the bait — see `Habitat.feedsAt`. */
export const RIG_LAYERS = ['surface', 'mid', 'bottom'] as const;
export type RigLayer = (typeof RIG_LAYERS)[number];

import Tool from '@saxonberg/server/mud/platform/thing/Tool';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { SchedulerApi } from '@saxonberg/server/mud/api/scheduler';
import { TakesFishMixin, type FishCast, type TakeFishOutcome } from '../lib/TakesFish';
import { FishingEngagement, FISHING_TYPE } from '../lib/FishingEngagement';
import Waters, { WATERS_PATH } from '../idea/Waters';

export default class Rod extends TakesFishMixin(Tool) {
  static commandContributions: CommandContributions = {
    self: [],
    // `environment` = whoever HOLDS it (the container chain outward); a
    // rod lying on the bank affords nothing until it is picked up.
    environment: [
      'trade/fishing/cmd/fishing/fish.yaml',
      'trade/fishing/cmd/fishing/reel.yaml',
      'trade/fishing/cmd/fishing/slack.yaml',
    ],
    peers: [],
  };

  static fieldMeta: FieldMeta = {
    showing: { persistent: true, authorable: true },
    breakStrain: { persistent: true, authorable: true },
    presentsAt: { persistent: true, authorable: true },
    hookGapeM: { persistent: true, authorable: true },
  };

  /** How well the tackle shows the bait — a factor on the bite, `1` ordinary. */
  public showing = 1;
  /** The strain the line parts at, `0..1`; `0` = the `fishing.contest.breakStrain` dial. */
  public breakStrain = 0;
  /** Where the rig puts the bait; `mid` is a free line. */
  public presentsAt: RigLayer = 'mid';
  /** The hook's gape in metres; `0` = unstated (any fish takes it). */
  public hookGapeM = 0;

  constructor() {
    super();
    this.capabilities = ['angling'];
  }

  public getShowing(): number {
    return this.showing;
  }
  public setShowing(value: number): void {
    this.showing = Number.isFinite(value) && value > 0 ? value : 1;
  }
  public getBreakStrain(): number {
    return this.breakStrain;
  }
  public setBreakStrain(value: number): void {
    this.breakStrain = Number.isFinite(value) && value > 0 ? Math.min(1, value) : 0;
  }
  public getPresentsAt(): RigLayer {
    return this.presentsAt;
  }
  public setPresentsAt(value: RigLayer): void {
    if (!(RIG_LAYERS as readonly string[]).includes(value)) {
      throw new RangeError(`Rod.setPresentsAt: unknown layer '${String(value)}' — one of ${RIG_LAYERS.join(', ')}`);
    }
    this.presentsAt = value;
  }
  public getHookGapeM(): number {
    return this.hookGapeM;
  }
  public setHookGapeM(value: number): void {
    this.hookGapeM = Number.isFinite(value) && value > 0 ? value : 0;
  }

  /**
   * ⭐ **A rod answers `fish` with a cast and a wait** (controller-liquidity
   * W12: the rod implements `TakesFish`, the spear's protocol). The line
   * goes out over `cast.reach` with whatever bait — the
   * `FishingEngagement` decides what a species makes of it, and the bite is
   * the fish's decision. One line out at a time, and hands that are free.
   */
  public override async takeFishBy(by: Stuff, cast: FishCast): Promise<TakeFishOutcome> {
    if (!MixinApi.isEngaged(by)) return { ok: false, reason: 'not-engageable' };
    if (by.getEngagementByType(FISHING_TYPE)) return { ok: false, reason: 'already-fishing' };
    const room = MixinApi.isContainable(by) ? by.getContainer() : null;
    if (room === null || cast.reach === null) return { ok: false, reason: 'no-water' };
    const waters = await StuffApi.singleton<Waters>(WATERS_PATH);
    const registry = await waters.registry();
    if (registry === null) return { ok: false, reason: 'no-record' };
    const engagement = new FishingEngagement({
      actor: by,
      rod: this,
      bait: cast.bait,
      reachRef: cast.reach,
      room,
      registry,
      feedFactors: (r, nowS) => waters.feedFactorsAt(r, nowS),
    });
    const result = SchedulerApi.start(engagement);
    if (result.ok && (result.status === 'started' || result.status === 'replaced')) {
      return { ok: true, facts: { kind: 'cast', bait: cast.bait, note: result.note } };
    }
    if (!result.ok && result.reason === 'engagement-conflict') return { ok: false, reason: 'engagement-conflict' };
    return { ok: false, reason: 'start-rejected' };
  }
}
