/**
 * SmallCraftMixin — ⭐ **a boat that floats in a place's water** (river W16):
 * a canoe, a punt, a dinghy — a THING in a water place, never positioned
 * (the river's rule: only places are tracked). The protocol the water and
 * the course talk to her through, so neither the water mod nor the kernel
 * imports the mod that builds her (the transport mod's `Boat`).
 *
 * Every member has an honest default — a craft that cannot be swamped,
 * carries no anchor, and has no sail — and the boat answers for herself.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';

export interface SmallCraft {
  /** How far her gunwale stands above the water now, m — what a wave must top to swamp her. */
  freeboardNowM(): number;
  /** She goes over: her people are in the water beside her. */
  capsize(why: string): void;
  /** Does she carry a kedge she can lie to — a killick? (A stop holding her is held by it.) */
  carriesKedge(): boolean;
  /** Let go her own anchor where she lies, and say what happened; `null` when she carries none. */
  letGoAnchor(by: Stuff): Promise<{ ok: boolean; line: string } | null>;
  /** Lay a course under sail from her tiller, or her refusal, in words. */
  sailCourse(heading: string, by: Stuff): Promise<{ ok: boolean; line: string }>;
}

export function SmallCraftMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class SmallCraftMixin extends Base implements SmallCraft {
    static _mixinName: string = 'SmallCraftMixin';

    /** @hook The boat's own freeboard. Default: high enough that nothing swamps her. */
    public freeboardNowM(): number {
      return Number.POSITIVE_INFINITY;
    }

    /** @hook The boat goes over. Default: nothing happens. */
    public capsize(why: string): void {
      void why;
    }

    /** @hook A boat with a killick aboard. Default: she carries none. */
    public carriesKedge(): boolean {
      return false;
    }

    /** @hook A boat lets go her killick. Default: she has nothing to let go. */
    public async letGoAnchor(by: Stuff): Promise<{ ok: boolean; line: string } | null> {
      void by;
      return null;
    }

    /** @hook A boat with a sail sails. Default: she has none. */
    public async sailCourse(heading: string, by: Stuff): Promise<{ ok: boolean; line: string }> {
      void heading;
      void by;
      return { ok: false, line: 'She has no sail to lay a course with.' };
    }
  };
}
