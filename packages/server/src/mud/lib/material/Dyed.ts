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
import { Colour } from '../perception/Colour';
import { AppApi } from '../../api/app';
import { Mml } from '../../api/mml';
import type { MarkupAugmenter } from '../../api/mml';
import { MixinApi } from '../../api/mixin';
import { PerceptionApi } from '../../api/perception';
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
  /**
   * ⭐⭐ What this application TRANSMITS, per channel, `0..1` — copied
   * off the shade when the bath was drawn, exactly as `fastness` is.
   *
   * **Copied rather than looked up, for two reasons.** `DyedMixin` is
   * KERNEL and `Dyestuff` is the dyeing PACK's, so a resolve-at-read
   * would need the kernel to reach into a pack, which it may not. And
   * the cloth should remember what was actually put on it — edit a dye
   * row later and old cloth keeps the colour it was given, which is
   * what happened physically.
   *
   * ⚠ Absent (all three `undefined`) on stacks written before the
   * colour model, and on a mordant-only entry. {@link colourOf} reads
   * a missing triple as UNDYED, so such an entry contributes nothing
   * rather than turning the cloth black.
   */
  transmitR?: number;
  transmitG?: number;
  transmitB?: number;
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
   * ⭐⭐ The stack folded subtractively — the position, of which
   * {@link getColorTag} is only the name.
   *
   * `null` when nothing legible is on it. This is what the wire's
   * swatch hex comes from, and it is why an overdyed piece can be a
   * colour no dye row contains.
   */
  getColorMix(): Colour | null;

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

/**
 * The colour one application contributes.
 *
 * ⚠ A missing triple reads as UNDYED — the identity for `over` — so a
 * pre-colour-model stack or a mordant-only entry contributes nothing
 * instead of multiplying the cloth to black. Fail toward "no colour",
 * never toward a wrong one.
 */
function colourOf(a: DyeApplication): Colour {
  if (
    typeof a.transmitR !== 'number' ||
    typeof a.transmitG !== 'number' ||
    typeof a.transmitB !== 'number'
  ) {
    return Colour.UNDYED;
  }
  return Colour.of(a.transmitR, a.transmitG, a.transmitB);
}

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
        /*
         * ⚠ The triple is OPTIONAL but not partial. All three or none:
         * two channels and a missing third would fold as an accidental
         * filter, which is a wrong colour rather than no colour, and a
         * wrong colour is the failure this whole model is meant not to
         * have.
         */
        const present = (['transmitR', 'transmitG', 'transmitB'] as const).map(
          (k) => a[k] !== undefined,
        );
        if (present.some(Boolean) && !present.every(Boolean)) {
          throw new RangeError(
            'Dyed.setDyeStack: transmitR/G/B must be given together or not at all',
          );
        }
        for (const k of ['transmitR', 'transmitG', 'transmitB'] as const) {
          const v = a[k];
          if (v === undefined) continue;
          if (!Number.isFinite(v) || v < 0 || v > 1) {
            throw new RangeError(`Dyed.setDyeStack: ${k} ${v} is outside 0..1`);
          }
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

    public getColorMix(): Colour | null {
      const legible = dial(
        AppSettingKeys.textilesDyeLegibleAt,
        DYE_DEFAULTS.LEGIBLE_AT,
      );
      // ⚠ Only what still READS counts — a stack that has washed out is
      // an undyed thing again, which is what "fading is desaturation"
      // means when it reaches the bottom.
      const live = this.dyeStack.filter((a) => a.strength >= legible);
      if (live.length === 0) return null;
      /*
       * ⭐⭐ OLDEST FIRST, and the order is not decoration: layered
       * filters commute in the arithmetic but the STACK is the record
       * of what happened, and a later wave (a dye that only takes over
       * a light ground, say) reads it. Folding in stack order keeps
       * that door open at no cost.
       *
       * ⚠ The base is UNDYED WHITE, deliberately and temporarily. The
       * honest base is the FIBRE's own colour — unbleached linen is
       * fawn, wool is cream to brown — which is what makes "linen was
       * worn undyed and wool was the coloured cloth" true, and it is
       * exactly what `DyeController`'s prose already leans on. That
       * needs a colour on `Material` rows, which is a wider change than
       * belongs here; see textiles.md.
       */
      const layers = live.map((a) =>
        colourOf(a).atStrength(a.strength),
      );
      const mixed = Colour.stack(layers);
      // ⚠ A stack of entries that carry no triple (pre-model rows, or a
      // mordant-only entry) folds to UNDYED, which is not a colour. Say
      // so rather than reporting white cloth.
      return mixed.depth() > 0 ? mixed : null;
    }

    public getColorTag(): ColorTag | null {
      return this.getColorMix()?.nearestTag() ?? null;
    }

    /**
     * ⭐⭐ The colour, said out loud — and until this landed, NOTHING
     * did. `getColorTag()` had no description consumer at all, so a
     * dyed thing announced its colour once at the vat and was silent
     * about it forever after.
     */
    static markupAugmenters: MarkupAugmenter[] = [dyeColourAugmenter];

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

/**
 * Append the derived colour to a dyed thing's long description.
 *
 * ⭐ The WORD carries it, and the tint is emphasis on top. `Mml.color`
 * takes a friendly colour name and resolves it client-side through the
 * theme palette — deliberately eight tints — so a dozen dye words
 * collapse onto a handful of hues at render. That is not a loss,
 * because the sentence already said "a deep green": the tint was never
 * the channel. It is also why no hex goes on the wire, which the
 * `<color>` grammar forbids for exactly this reason.
 *
 * ⚠⚠ **Gated on light, and reusing the shipped gate rather than
 * inventing a lux cutoff.** `canMakeOutMarks` exists because *"knowing
 * that a scroll is there and being able to read it are different
 * questions"* — colour is the same class of question. In an unlit
 * cellar you can tell a coat is a coat and not what colour it is, and
 * a client that showed the colour anyway would be more informative
 * than the eyes it is meant to be reporting.
 */
function dyeColourAugmenter(
  text: string,
  host: Stuff,
  viewer: Stuff,
): string {
  if (!MixinApi.isDyed(host)) return text;
  const mix = host.getColorMix();
  if (mix === null) return text;
  if (!PerceptionApi.canMakeOutMarks(viewer, host)) {
    // ⚠ Say that the colour is unreadable rather than saying nothing —
    // an absent line reads as "undyed", which is a different fact and
    // the wrong one. Honest fog, not silence.
    return `${text}\n\nToo dim to tell what colour it is.`;
  }
  const tag = mix.nearestTag();
  /*
   * ⭐ The fade is worth saying out loud. Knowing WHEN to re-dye is the
   * mechanic the whole fastness half exists for, and a colour that
   * only silently drifts toward the fibre gives the player nothing to
   * act on. The threshold is the same `legibleAt` the stack filter
   * uses, doubled — near enough the bottom to be a warning.
   */
  const legible = dial(
    AppSettingKeys.textilesDyeLegibleAt,
    DYE_DEFAULTS.LEGIBLE_AT,
  );
  const body =
    mix.depth() < legible * 2
      ? `Dyed ${tag}, and washing out.`
      : `Dyed ${tag}.`;
  return `${text}\n\n${Mml.color(tag, body).toString()}`;
}
