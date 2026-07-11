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
  /**
   * Rest-quality multiplier for a body resting on this host — how much
   * better than open ground it is for recovery. Default `1.0` (the
   * floor / standing); a bedroll authors ~1.3×, a four-poster ~2.5×.
   * Read by metabolism's coupled-recovery calc off the host whose
   * posture slot the body occupies. A behavior-specific field on the
   * specialized posture-bearing host (the `Vessel.transmissionFactor`
   * pattern), NOT on the universal `SlotSpec`.
   */
  getRestQuality(): number;
  setRestQuality(value: number): void;
  /**
   * Warming bonus (Kelvin) a body occupying this host's posture slot
   * adds to its effective ambient. Default `0` (neutral). A campfire
   * log-seat authors both `restQuality` (recover) and `warmth` (stay
   * warm); read by the Phase-2 effective-ambient resolver off the host
   * whose posture slot the body occupies, exactly as recovery reads
   * `restQuality`. The radiant warmth enters through this CONSTANT slot
   * attribute (refreshed on occupy/leave), not the live fire
   * temperature, so the body's effective ambient stays piecewise-
   * constant between discrete events.
   */
  getWarmth(): number;
  setWarmth(value: number): void;
}

export function PosturedMixin<TBase extends MixinConstructor<Stuff & Slotted>>(
  Base: TBase
) {
  return class PosturedMixin extends Base {
    static _mixinName = 'PosturedMixin';

    static persistentFields = ['restQuality', 'warmth'];

    /**
     * Recovery multiplier for a body at rest on this host. Default
     * `1.0` (no better than open ground). Strictly positive — a value
     * `> 1` speeds recovery (a comfortable bed), values in `(0, 1)` are
     * legal but reserved (a cramped perch). Per-field invariant on the
     * setter (finite, `> 0`).
     *
     * @authorable
     */
    public restQuality: number = 1.0;

    getRestQuality(): number {
      return this.restQuality;
    }

    setRestQuality(value: number): void {
      if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
        throw new RangeError(
          `PosturedMixin.setRestQuality: expected a finite number > 0, ` +
            `got ${String(value)}`
        );
      }
      this.restQuality = value;
    }

    /**
     * Warming bonus (Kelvin, additive to a slot-occupant's effective
     * ambient). Default `0` (neutral). Per-field invariant on the setter
     * (finite, `>= 0`).
     *
     * @authorable
     */
    public warmth: number = 0;

    getWarmth(): number {
      return this.warmth;
    }

    setWarmth(value: number): void {
      if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
        throw new RangeError(
          `PosturedMixin.setWarmth: expected a finite number >= 0, ` +
            `got ${String(value)}`
        );
      }
      this.warmth = value;
    }

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
