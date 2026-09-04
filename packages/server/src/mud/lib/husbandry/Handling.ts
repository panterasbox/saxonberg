/**
 * HandlingMixin — **how easy this animal is to work with**, and ⭐ a
 * safety mechanic before it is an efficiency one.
 *
 * ## Why not a bond
 *
 * A cow must not have pet-love. But without *something* an individual
 * animal is per-head bookkeeping and nothing else, so D27 asks what the
 * real axis is and answers it honestly: **handling** — temperament,
 * flight zone, ease of working. It is real animal husbandry, it is
 * **earned by contact and lost by neglect**, and it is economically
 * consequential.
 *
 * ⭐⭐ **And the second clause is the important one** (D46). D27 gave
 * tractability an economic consequence, which is the smaller half.
 * *Quiet stock handling exists in the real world because flighty animals
 * injure people.* Cattle are the most dangerous thing on a farm — a
 * bull, and a cow with a calf — and crushing against a gate, kicks and
 * trampling in a race are what actually happens. So a badly handled
 * animal is a **hazard**, not an inconvenience, which is what gives D27
 * its teeth and gives a keeper a reason to handle stock properly beyond
 * a yield percentage.
 *
 * ## Why it lives in the KERNEL
 *
 * Pets will want it, and pets is not ranching: its composers share no
 * pack ancestor, which is the actual test for kernel-versus-pack. It is
 * also the one place pets and livestock touch mechanically (D42's
 * working dog), and that is the reason the family is one substrate.
 *
 * ## The shape
 *
 * One number in `[0, 1]`, **reconciled on read** so it decays across an
 * absence like everything else a keeper owns, with a per-species floor
 * and ceiling authored nowhere yet — a wild thing does not become a pet
 * because you fed it, and a dairy cow does not become dangerous because
 * you were away a week.
 *
 * See [docs/subsystems/ranching.md].
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import { StuffApi } from '../../api/stuff';
import { WorldClockApi } from '../../api/worldclock';
import { TemplatePaths } from '../paths';
import type { Stuff } from '../stuff/Stuff';

const SECONDS_PER_GAME_DAY = 86_400;

/**
 * How much handling decays per GAME day of no contact (D89 — never an
 * unqualified "day"). ⭐ Slow: about a game month to fall a whole band,
 * which is roughly two and a half real days. Stock you stopped working
 * gets harder to work, and it takes a season rather than a weekend.
 */
const DECAY_PER_GAME_DAY = 0.01;

/**
 * ⚠ The floor decay cannot go below. An animal you have raised does not
 * become feral because you were away; it becomes **difficult**, which is
 * a different and recoverable thing.
 */
const DECAY_FLOOR = 0.15;

/** What one handling act is worth, before the diminishing return. */
const HANDLING_PER_ACT = 0.06;

/**
 * The bands, wild to quiet — ⭐ a CLOSED, ordinal vocabulary in the
 * words a stockman uses.
 */
export const HANDLING_BANDS = ['wild', 'flighty', 'wary', 'steady', 'quiet'] as const;

export type HandlingBand = (typeof HANDLING_BANDS)[number];

/**
 * ⭐ Exhaustive by construction — a sixth band cannot be added without
 * writing its sentence. Each says what the animal DOES, not what its
 * number is: a reader watches it and infers the husbandry.
 */
const HANDLING_PHRASE: Readonly<Record<HandlingBand, string>> = {
  wild: 'it will not let you near it, and it watches the gate rather than you',
  flighty: 'it swings away the moment you move, and it will go through a fence rather than past you',
  wary: 'it gives ground as you come up, and settles again a few paces off',
  steady: 'it stands to be handled and moves off quietly when you ask',
  quiet: 'it comes to you, and it works as though the two of you had agreed on it',
};

/** The public surface handling offers. */
export interface Handling {
  /** Tractability `[0, 1]`, reconciled. */
  getHandling(): number;
  /** The band — what a person watching would say. */
  handlingBand(): HandlingBand;
  /** What that looks like. */
  handlingPhrase(): string;
  /**
   * Work with the animal: raises handling with a **diminishing return**,
   * so the last of it is dear and the first is cheap — which is why a
   * halter-broken calf is worth the trouble and the twentieth session is
   * not.
   */
  handle(quality?: number): number;
  /**
   * ⭐⭐ **The risk this animal presents to whoever is working it**
   * (D46), `[0, 1]`. The hazard build reads this; nothing gates on it.
   */
  handlingRisk(): number;
  /** Decay handling over elapsed game-time. Sync, read-triggered. */
  reconcileHandling(): void;
}

export function HandlingMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class HandlingMixin extends Base implements Handling {
    static _mixinName = 'HandlingMixin';

    static fieldMeta: FieldMeta = {
      /**
       * ⭐ `spoiler: 1` with `spoilerName: 0` — the documented split for
       * a MEASURED property, and the whole of the honest-opacity ladder
       * in two flags.
       *
       * *That an animal has a temperament* is not a secret; it is what
       * `help` and the concept topics publish. **`0.62` is the thing you
       * pay an act for** — by eye you get a band, and a wiki panel
       * printing the number would defeat the ladder from outside the
       * game entirely.
       *
       * ⚠ The split is opting into a redaction marker, which the reveal
       * model refuses elsewhere. It is coherent here for the reason it is
       * coherent on `Material`'s density: the NAME was already public.
       */
      handling: {
        persistent: true,
        authorable: true,
        spoiler: 1,
        spoilerName: 0,
      },
      handlingStamp: { persistent: true },
    };

    /**
     * Tractability `[0, 1]`. ⭐ Authorable, so content ships an animal at
     * any point on the axis — a halter-broken pony, a bull nobody has
     * been able to get a rope on, a lamb that has never seen a person.
     * The default is `wary`: an animal that has met people and does not
     * trust them, which is what an unhandled farm animal actually is.
     */
    public handling = 0.4;

    /** Game-seconds stamp of the last decay reconcile; `0` = never. */
    public handlingStamp = 0;

    protected _reconcilingHandling = false;

    public getHandling(): number {
      this.reconcileHandling();
      return this.handling;
    }

    public handlingBand(): HandlingBand {
      const h = this.getHandling();
      if (h < 0.2) return 'wild';
      if (h < 0.4) return 'flighty';
      if (h < 0.62) return 'wary';
      if (h < 0.85) return 'steady';
      return 'quiet';
    }

    public handlingPhrase(): string {
      return HANDLING_PHRASE[this.handlingBand()];
    }

    public handle(quality = 1): number {
      this.reconcileHandling();
      const q = quality < 0 ? 0 : quality > 1 ? 1 : quality;
      // ⭐ The diminishing return is `(1 − h)`: the same act moves a wild
      // animal a long way and a quiet one hardly at all, which is both
      // true and the reason nobody grinds this to 1.
      const gain = HANDLING_PER_ACT * q * (1 - this.handling);
      this.handling = clamp01(this.handling + gain);
      return this.handling;
    }

    /**
     * ⭐⭐ **A badly handled animal is a hazard** (D46).
     *
     * The risk is the complement of tractability, squared — so it is
     * near zero across the whole quiet end and climbs steeply at the
     * wild end, which is how animal handling injuries actually
     * distribute. **Nothing in this build gates on it**; it is what the
     * hazard wave's `ConditionApi.inflict` reads.
     */
    public handlingRisk(): number {
      const h = this.getHandling();
      return (1 - h) * (1 - h);
    }

    /**
     * Handling decays with no contact.
     *
     * ⚠ **No far-past guard**, deliberately — stock you stopped working
     * gets harder to work, and that is the whole mechanic. But it decays
     * to a FLOOR rather than to zero: an animal you raised does not
     * become feral because you were away, it becomes difficult, and D45's
     * slope means what accrues in your absence must never be
     * catastrophic.
     */
    public reconcileHandling(): void {
      if (this._reconcilingHandling) return;
      if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) return;
      const nowS = WorldClockApi.getNow().rawValue();
      if (this.handlingStamp === 0) {
        this.handlingStamp = nowS;
        return;
      }
      const elapsed = nowS - this.handlingStamp;
      if (elapsed <= 0) {
        this.handlingStamp = nowS;
        return;
      }
      this._reconcilingHandling = true;
      try {
        const days = elapsed / SECONDS_PER_GAME_DAY;
        const decayed = this.handling - DECAY_PER_GAME_DAY * days;
        this.handling = clamp01(Math.max(DECAY_FLOOR, decayed));
        this.handlingStamp = nowS;
      } finally {
        this._reconcilingHandling = false;
      }
    }
  };
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
