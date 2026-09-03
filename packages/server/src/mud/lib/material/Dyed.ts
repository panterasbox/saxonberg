/**
 * DyedMixin — a thing that has been through a dye bath.
 *
 * ## ⚠⚠ It stores the APPLICATION STACK, never a colour word
 *
 * A dyed thing records `[{dyestuff, mordant, strength}]` — what was put
 * on it, in order. The colour it *reads* as is **derived**. Three things
 * fall out of that and out of no table:
 *
 * - **overdyeing is arithmetic.** Blue over yellow *is* green; that is
 *   how green was actually made, and it needs no row.
 * - **fading is desaturation.** Wash decay lowers `strength`, and a weak
 *   stack derives back toward the undyed word on its own.
 * - **authors author DYES, not colours.** Each `(dyestuff, mordant)`
 *   pair resolves to a position in a small colour space, authored on the
 *   dye rows; the palette is only a lookup for prose.
 *
 * ⭐ It rides `ColorTag` — `lib/perception/Light.ts` reserved that
 * name for *"the abstraction layer above color temperature… new
 * abstract-color concepts plug in here"*, and its only user until now
 * was stained glass. **Dye is the second user of a seam already cut for
 * exactly this**, so no colour model is invented.
 *
 * ## Fastness is the craft's, and washing is what tests it
 *
 * `fastness` (`0..1`) is how well the colour is BOUND — a property of
 * `(dyestuff, mordant, fibre)`, set when the bath is drawn. ⭐ The hue
 * comes from the dyestuff; **the durability comes from the craft**, and
 * that is why competence in dyeing buys fastness and repeatability and
 * never a brighter colour.
 *
 * `launder()` is the test: each wash strips colour in proportion to
 * `1 − fastness`, so an un-mordanted piece washes straight out on the
 * first launder and a well-mordanted one survives many. The bond itself
 * weakens a little each time, which is why even good work eventually
 * needs redoing — the craft's value is in the upkeep, not the one-time
 * act.
 *
 * ⚠ This mixin is **kernel** rather than a pack's, because a pack `src/`
 * may hold only branches, controllers and tests — no `lib/`, no mixins.
 * The dyeing trade consumes it; it does not ship it.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { ColorTag } from '../perception/Light';
import { AppApi } from '../../api/app';
import { AppSettingKeys } from '../config/AppSettings';

/**
 * One trip through a bath. Flat scalars — the `CompositionEntry` /
 * `NaturalAttackSpec` shape, so it round-trips through the default
 * Hydrator with no marshaller.
 */
export interface DyeApplication {
  /** Template path of the dyestuff material (madder, weld, woad). */
  dyestuff: string;
  /** The mordant key (`alum`, `iron`, `tannin`), or `''` for a vat dye. */
  mordant: string;
  /** How much colour is on, `0..1`. Washing lowers it. */
  strength: number;
}

export interface Dyed {
  /** The applications, oldest first. Empty = undyed. */
  getDyeStack(): readonly DyeApplication[];
  setDyeStack(value: DyeApplication[]): void;
  /** Add one application (the `dye` act's write). */
  applyDye(application: DyeApplication): void;

  /** How well the colour is bound, `0..1`. */
  getFastness(): number;
  setFastness(value: number): void;

  /**
   * The colour this thing reads as — the stack combined and named by
   * its nearest palette neighbour, or `null` when nothing is on it (or
   * what is on it has washed out below legibility).
   *
   * ⚠ Derived on every read. Nothing stores a colour word.
   */
  getColorTag(): ColorTag | null;

  /**
   * One trip through the wash. Strips colour in proportion to
   * `1 − fastness` and weakens the bond a little. Returns `true` if
   * anything actually changed, so a caller can say so.
   *
   * ⚠ Water is a **precondition**, never a consumable — the wash act
   * checks for it and does not spend it.
   */
  launder(): boolean;
}

/** Dye dials with seeded-literal fallbacks (pre-warm / test safe). */
const DYE_DEFAULTS = {
  /**
   * Fraction of remaining colour a fully-unbound dye loses per wash.
   * ⭐ Near-total on purpose: dye something un-mordanted and it washes
   * STRAIGHT OUT on the first launder, which is the stated failure mode
   * and the thing every competence answer is visible against.
   */
  WASH_LOSS: 0.95,
  /** How much the BOND itself weakens per wash (of what is left). */
  BOND_LOSS: 0.05,
  /** Strength below which an application no longer reads at all. */
  LEGIBLE_AT: 0.08,
} as const;

function dial(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    if (raw === '' || raw == null) return fallback;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

export function DyedMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class DyedMixin extends Base implements Dyed {
    static _mixinName = 'DyedMixin';
    static fieldMeta: FieldMeta = {
      dyeStack: { persistent: true, authorable: true },
      fastness: { persistent: true, authorable: true },
    };

    /** The applications, oldest first. Empty = undyed (the sparse default). */
    public dyeStack: DyeApplication[] = [];
    /** How well the colour is bound. `0` = it will wash straight out. */
    public fastness = 0;

    public getDyeStack(): readonly DyeApplication[] {
      return this.dyeStack;
    }

    public setDyeStack(value: DyeApplication[]): void {
      if (!Array.isArray(value)) {
        throw new TypeError('Dyed.setDyeStack: must be an array');
      }
      for (const a of value) {
        if (typeof a?.dyestuff !== 'string' || a.dyestuff.length === 0) {
          throw new RangeError('Dyed.setDyeStack: each entry needs a dyestuff');
        }
        if (!Number.isFinite(a.strength) || a.strength < 0 || a.strength > 1) {
          throw new RangeError(
            `Dyed.setDyeStack: strength ${a.strength} is outside 0..1`,
          );
        }
      }
      this.dyeStack = value.map((a) => ({ ...a }));
    }

    public applyDye(application: DyeApplication): void {
      this.setDyeStack([...this.dyeStack, application]);
    }

    public getFastness(): number {
      return this.fastness;
    }

    public setFastness(value: number): void {
      if (!Number.isFinite(value) || value < 0 || value > 1) {
        throw new RangeError(`Dyed.setFastness: ${value} is outside 0..1`);
      }
      this.fastness = value;
    }

    public getColorTag(): ColorTag | null {
      const legible = dial(
        AppSettingKeys.textilesDyeLegibleAt,
        DYE_DEFAULTS.LEGIBLE_AT,
      );
      // ⚠ Only what still READS counts — a stack that has washed out is
      // an undyed thing again, which is what "fading is desaturation"
      // means when it reaches the bottom.
      const live = this.dyeStack.filter((a) => a.strength >= legible);
      if (live.length === 0) return null;
      // The palette lookup itself is the dyeing pack's — it authors the
      // `(dyestuff, mordant)` → colour-space positions. Until it ships,
      // the honest derivation is the dominant application's own key,
      // which is a real answer rather than a placeholder colour word.
      let dominant = live[0]!;
      for (const a of live) if (a.strength > dominant.strength) dominant = a;
      return dominant.mordant
        ? `${dominant.dyestuff}+${dominant.mordant}`
        : dominant.dyestuff;
    }

    public launder(): boolean {
      if (this.dyeStack.length === 0) return false;
      const washLoss =
        (1 - clamp01(this.fastness)) *
        dial(AppSettingKeys.textilesDyeWashLoss, DYE_DEFAULTS.WASH_LOSS);
      const bondLoss = dial(
        AppSettingKeys.textilesDyeBondLoss,
        DYE_DEFAULTS.BOND_LOSS,
      );
      let changed = false;
      const next = this.dyeStack.map((a) => {
        const strength = clamp01(a.strength * (1 - washLoss));
        if (strength !== a.strength) changed = true;
        return { ...a, strength };
      });
      this.dyeStack = next;
      // ⭐ The bond weakens a little every time, so even good work
      // eventually needs redoing — the craft's value is the upkeep.
      const fastness = clamp01(this.fastness * (1 - bondLoss));
      if (fastness !== this.fastness) changed = true;
      this.fastness = fastness;
      return changed;
    }
  };
}
