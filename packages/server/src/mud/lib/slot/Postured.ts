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

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { Slotted } from './Slotted';
import { MixinApi } from '../../api/mixin';
import type { ActOutcome, ActRefusal } from '../craft/ActPlan';

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

/**
 * ⭐ Why a body could not take a posture on this host — the float's, since
 * a resting posture's refusals are the body's own (`transferPosture`).
 *  - `not-a-swimmer` — nothing that breathes (a body with no airway) floats.
 *  - `not-at-surface` · `cannot-float` · `too-heavy` — the body's `float()`.
 */
export type PostureRefusal =
  | ActRefusal<'not-a-swimmer'>
  | ActRefusal<'not-at-surface'>
  | ActRefusal<'cannot-float'>
  | ActRefusal<'too-heavy'>;

/**
 * ⭐ What taking a posture on this host comes to (controller-liquidity W8):
 * `rest` — the host takes the body as it is (the body's `transferPosture`
 * is the act, and nothing has happened yet); `float` — the host is water
 * that will not hold you up, so lying on it is floating, and that is done
 * (`feetFirst` in moving water); `held` — the host already holds the body
 * in its slot (standing in the shallows), so only the posture changes
 * (controller-liquidity W7c: `stand`).
 */
export type PostureAnswer =
  | ActOutcome<{ as: 'rest' }>
  | ActOutcome<{ as: 'held' }>
  | ActOutcome<{ as: 'float'; feetFirst: boolean }>
  | PostureRefusal;

export interface Postured extends Slotted {
  /**
   * ⭐ **The host decides what `posture` on it means for `actor`**
   * (controller-liquidity W8): a bed or a floor takes a body at rest; the
   * surface of deep or moving water does not hold you, and lying on it is
   * floating. Default `rest`.
   */
  acceptPosture(actor: Stuff, posture: string): Promise<PostureAnswer>;
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
  /**
   * ⭐ How this rests a body AS KEPT (cleanliness D16): its own
   * `restQuality` × how dirty it is × how dirty the room's floor is
   * (`clean 1 · marked 0.95 · soiled 0.8 · filthy 0.6`). A filthy bed is a
   * worse bed, never a punishment. Total: a host that carries no dirt
   * rests you as it always did.
   */
  restQualityAsKept(): number;
  setRestQuality(value: number): void;
  /**
   * ⭐⭐ **How much this surface speeds WOUND recovery**, over and above
   * how good a night's sleep it is. Default `1.0` (no clinical benefit).
   * Read ONLY by the wound driver (`Vitals.convalescenceFactor`), never
   * by stamina recovery — which is why it is a SECOND field beside
   * `restQuality` rather than a bigger `restQuality`: a clinic cot
   * (`restQuality 1.5, convalescence 2.0`) mends a wound faster than a
   * home four-poster (`restQuality 2.0`, convalescence 1.0) without also
   * being a better night's sleep. The two axes are genuinely different
   * facts about a surface.
   */
  getConvalescence(): number;
  setConvalescence(value: number): void;
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

/** How a soil band rests a body (cleanliness D16). */
const KEPT_FACTOR: Readonly<Record<string, number>> = {
  clean: 1,
  marked: 0.95,
  soiled: 0.8,
  filthy: 0.6,
};

function keptFactor(stuff: Stuff): number {
  return MixinApi.isSoilable(stuff) ? (KEPT_FACTOR[stuff.soilBand()] ?? 1) : 1;
}

export function PosturedMixin<TBase extends MixinConstructor<Stuff & Slotted>>(
  Base: TBase
) {
  return class PosturedMixin extends Base {
    static _mixinName = 'PosturedMixin';

    static fieldMeta: FieldMeta = {
      restQuality: { persistent: true, authorable: true },
      convalescence: { persistent: true, authorable: true },
      warmth: { persistent: true, authorable: true },
    };

    /**
     * Recovery multiplier for a body at rest on this host. Default
     * `1.0` (no better than open ground). Strictly positive — a value
     * `> 1` speeds recovery (a comfortable bed), values in `(0, 1)` are
     * legal but reserved (a cramped perch). Per-field invariant on the
     * setter (finite, `> 0`).
     */
    public restQuality: number = 1.0;

    getRestQuality(): number {
      return this.restQuality;
    }

    restQualityAsKept(): number {
      const self = this as unknown as Stuff;
      let k = this.getRestQuality() * keptFactor(self);
      const room = MixinApi.isContainable(self) ? self.getContainer() : null;
      const floor =
        room && MixinApi.isAdornable(room) ? (room.getFloor() as unknown as Stuff | null) : null;
      if (floor && floor !== self) k *= keptFactor(floor);
      return k;
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
     * Wound-recovery multiplier for a body at rest on this host. Default
     * `1.0` (a bed is a bed; no clinical benefit). Strictly positive —
     * a value `> 1` speeds mending (a clinic cot), `(0, 1)` is legal but
     * reserved. Read only by `Vitals.convalescenceFactor`.
     */
    public convalescence: number = 1.0;

    getConvalescence(): number {
      return this.convalescence;
    }

    setConvalescence(value: number): void {
      if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
        throw new RangeError(
          `PosturedMixin.setConvalescence: expected a finite number > 0, ` +
            `got ${String(value)}`
        );
      }
      this.convalescence = value;
    }

    /**
     * Warming bonus (Kelvin, additive to a slot-occupant's effective
     * ambient). Default `0` (neutral). Per-field invariant on the setter
     * (finite, `>= 0`).
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

    /** @hook What `posture` on this host comes to; the default takes a body at rest. */
    public async acceptPosture(_actor: Stuff, _posture: string): Promise<PostureAnswer> {
      return { ok: true, facts: { as: 'rest' } };
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
