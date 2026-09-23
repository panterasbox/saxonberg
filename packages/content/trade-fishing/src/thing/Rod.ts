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

import ToolItem from '@saxonberg/server/mud/platform/thing/ToolItem';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';

export default class Rod extends ToolItem {
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
}
