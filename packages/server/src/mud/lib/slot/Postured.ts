/**
 * PosturedMixin — host-side world affordance: "this Stuff exposes
 * posture-bearing slots."
 *
 * Composes on `Stuff & Slotted` — extends Slotted's host requirement.
 * Adds the "posture-bearing slot" concept: a slot whose `SlotSpec`
 * declares `postures: string[]` non-empty.
 *
 * A chair's `sit:1` accepts `['sit']`; a bed's `lie:1` accepts
 * `['lie', 'sit']`; a floor's `ground:1` accepts
 * `['sit', 'lie', 'kneel', 'stand']`.
 *
 * Worn / held / mount / fixture slots are NOT posture-bearing —
 * their specs leave `postures` undefined.
 *
 * Posture vocabulary lives in the `Postures` const-object exported
 * here (decision #16, decision #5 of the resolved-decisions table).
 * Verbs and validators import `Postures` from this module.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { Slotted } from './Slotted';

/**
 * Posture vocabulary — frozen constants module. Mod-introduced
 * postures ship their own constants module; the substrate doesn't
 * need to know the closed set.
 */
export const Postures = Object.freeze({
  Stand: 'stand',
  Sit: 'sit',
  Lie: 'lie',
  Kneel: 'kneel',
  Mounted: 'mounted',
} as const);

export type Posture = typeof Postures[keyof typeof Postures];

export interface Postured extends Slotted {
  /** Postures the named slot accepts. Empty array if not posture-bearing. */
  getAcceptedPostures(slot: string): readonly string[];
  /** Slots accepting the given posture (across the whole universe). */
  getSlotsAcceptingPosture(p: string): readonly string[];
}

export function PosturedMixin<TBase extends MixinConstructor<Stuff & Slotted>>(
  Base: TBase
) {
  return class PosturedMixin extends Base {
    static _mixinName = 'PosturedMixin';

    getAcceptedPostures(
      this: Stuff & Slotted,
      slot: string
    ): readonly string[] {
      return this.getSlotSpec(slot)?.postures ?? [];
    }

    getSlotsAcceptingPosture(
      this: Stuff & Slotted,
      p: string
    ): readonly string[] {
      const out: string[] = [];
      for (const name of this.getSlotNames()) {
        const postures = this.getSlotSpec(name)?.postures ?? [];
        if (postures.includes(p)) out.push(name);
      }
      return out;
    }
  };
}
