/**
 * RiverPlace — ⭐ **an authored water place on a river's line** (river D8):
 * the stream below the Wharfside quay, a pool in the gorge, a mill pond.
 *
 * A river place IS a pool with a line position — ordinary OO over the
 * platform's `Pool`. Its author owns the water along its span (`current:`
 * says how it moves; `inherit` reads the line). Its ends are where the
 * line hands you in and takes you out: a way `downstream` (and `upstream`)
 * into the water beyond it, which the river's warren works out when you
 * take it.
 */

import Pool from '@saxonberg/server/mud/platform/location/Pool';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { RiverWaterMixin } from '../lib/RiverWater';
import type ReachWarren from '../idea/ReachWarren';

/** The river's warren, where a place hands a body to the line. */
const WARREN_PATH = '/system/water/idea/ReachWarren';

export default class RiverPlace extends RiverWaterMixin(Pool) {
  /** ⭐ Its ways onto the line, at the ends that hand off (river D7). */
  public override async onCreate(context?: unknown): Promise<void> {
    await super.onCreate(context);
    const river = this.getRiver();
    if (river === null) return;
    const warren = await StuffApi.singleton<ReachWarren>(WARREN_PATH).catch(() => null);
    if (warren) await warren.installEnds(this as unknown as Stuff & RiverPlace);
  }

  /**
   * ⭐ The current takes a body that is not holding: out at the place's
   * downstream end, onto the line (river D11).
   */
  public override async sweep(body: Stuff): Promise<boolean> {
    const river = this.getRiver();
    if (river === null || (river.ends?.downstream ?? 'handoff') !== 'handoff') return false;
    if (!MixinApi.isContainable(body)) return false;
    const warren = await StuffApi.singleton<ReachWarren>(WARREN_PATH).catch(() => null);
    if (!warren) return false;
    return warren.handOutOf(this as unknown as Stuff & RiverPlace, body, 'downstream');
  }
}
