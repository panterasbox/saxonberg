/**
 * EdibilityMixin — *it can be EATEN.*
 *
 * Composing this IS the fact: the authored `edibility` flag is retired
 * (decomposition D9), and "can this be eaten" is `MixinApi.hasEdibility(m)`. Carries the five tastes, the dietary nutrients and their amounts, and
 * what one serving is.
 *
 * A capability of a material, named for the substance's physics, never for
 * a process that reads it (material-decomposition D1). A consumer narrows
 * with `MixinApi.hasEdibility(m)` and never on a material's kind.
 */

import type { FieldMeta, MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { HedonicCurve } from '../perception/Aroma';

/**
 * The five basic tastes — the physiology's own closed list, and the whole
 * authored flavour vocabulary. Everything a player reads about how a dish
 * tastes is DERIVED from these plus what went into it; nothing anywhere
 * authors a per-dish flavour string.
 */
export const BASIC_TASTES: readonly string[] = [
  'sweet',
  'salty',
  'sour',
  'bitter',
  'umami',
];

/** A taste a substance carries: `amount` in g/kg of the substance. */
export interface TasteTag {
  type: string;
  amount: number;
}

/**
 * Detection thresholds, g/kg: order-of-magnitude literature figures. They are
 * why a little bitter cuts through a lot of sugar. Physiology, closed with the
 * list they extend.
 */
export const TASTE_THRESHOLDS: Readonly<Record<string, number>> = {
  sweet: 5,
  salty: 1,
  sour: 0.5,
  bitter: 0.005,
  umami: 0.3,
};

/**
 * How a human tongue takes each taste, in log10 of its multiple of threshold.
 * Past its peak a pleasant taste turns: too salty reads badly to nearly
 * everyone. Bitter has no peak; it only gets worse. A species may override
 * any of them (`Species.palate`), which is the grain and not the law.
 */
export const TASTE_HEDONICS: Readonly<Record<string, HedonicCurve>> = {
  sweet: { peak: 1.5, width: 1.5, valence: 1 },
  salty: { peak: 0.8, width: 1, valence: 1 },
  sour: { peak: 0.6, width: 1, valence: 1 },
  umami: { peak: 1.2, width: 1.5, valence: 1 },
  bitter: { peak: 0, width: 3, valence: -1 },
};

export interface Edibility {
  getNutrients(): readonly string[];
  setNutrients(value: string[]): void;
  getNutrientAmounts(): Readonly<Record<string, number>>;
  setNutrientAmounts(value: Record<string, number>): void;
  getServingKg(): number;
  setServingKg(value: number): void;
  getTastes(): readonly TasteTag[];
  setTastes(value: readonly TasteTag[]): void;
}

export function EdibilityMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class EdibilityMixin extends Base implements Edibility {
    static _mixinName = 'EdibilityMixin';

    static fieldMeta: FieldMeta = {
      tastes: { persistent: true, spoiler: 1, spoilerName: 0 },

      // ── What it does to you. The most worth finding out. ──
      nutrients: { persistent: true, spoiler: 1, spoilerName: 0 },
      nutrientAmounts: { persistent: true, spoiler: 1, spoilerName: 0 },
      // ⭐ What one serving is, kg — the unit of the two rows around it.
      // Collapsed like its siblings: knowing it is knowing the label.
      servingKg: { persistent: true, authorable: true, spoiler: 1, spoilerName: 0 },
    };


    /**
     * Tagged nutrient categories (`'protein'`, `'water'`, `'sugar'`) —
     * the tags that **drive metabolism's macro routing** (kept as bare
     * tags for back-compat with existing seeds). The inspectable
     * per-amount profile lives in {@link nutrientAmounts}.
     */
    protected nutrients: string[] = [];

    /**
     * Inspectable nutrient amounts (tag → mg per serving, see
     * {@link servingKg}) — the
     * education-by-reference profile `look <food>` surfaces. Parallel
     * to {@link nutrients}: the tags drive routing, these amounts are
     * data + display only (no body-side machinery). A flat
     * `Record<string, number>` → default-applier round-trip (the
     * `reserves` precedent), no marshaller.
     */
    protected nutrientAmounts: Record<string, number> = {};

    /**
     * ⭐ **What one serving of this material is, in kg** — the unit every
     * per-serving number on this row ({@link nutrientAmounts},
     * {@link toxicity}) is per (ceramics re-plan R1-D1). `0` = unauthored,
     * and the serving derives as the `nutrition.servingLitres` dial (a
     * quarter litre) at this material's density — read it through
     * `MaterialApi.servingKgOf`, never here, so the default lives in one
     * place.
     *
     * ⭐ A blend stores what went into it as mass FRACTIONS (`makeup`), and
     * a part's servings derive at the read: `fraction × hostKg / servingKg`.
     * So this is what keeps a martini at gin 19 + vermouth 7: gin's serving
     * is its bar measure (60 ml × 940 kg/m³), and a recipe that uses gin AT
     * its measure gives exactly one serving of it.
     */
    protected servingKg = 0;

    /**
     * ⭐ **The basic tastes this substance carries** — a closed five-word
     * vocabulary (`sweet` · `salty` · `sour` · `bitter` · `umami`), the
     * physiology's own list and not a flavour-note bank.
     *
     * ⚠ It is deliberately NOT prose. What a dish tastes *like* is derived
     * from what went into it, projected through the taster's own palate:
     * a novice cook gets the dominant tastes, someone competent picks out
     * the ingredients, and an expert reads the grade. Authoring a
     * "flavour string" per dish is the retired per-dish-material
     * anti-pattern wearing a different hat — see
     * [docs/subsystems/spoilage.md] and `crafting.md`.
     *
     * Empty is the honest default: most materials have never been tasted
     * by anybody who wrote them down.
     */
    protected tastes: TasteTag[] = [];


    public getNutrients(): readonly string[] { return this.nutrients; }
    public setNutrients(value: string[]): void { this.nutrients = value; }

    public getNutrientAmounts(): Readonly<Record<string, number>> {
      return this.nutrientAmounts;
    }
    public setNutrientAmounts(value: Record<string, number>): void {
      if (value === null || typeof value !== 'object') {
        throw new TypeError(
          'Material.setNutrientAmounts: expected a Record<string, number>',
        );
      }
      for (const [k, v] of Object.entries(value)) {
        if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) {
          throw new RangeError(
            `Material.setNutrientAmounts['${k}']: expected a finite number >= 0`,
          );
        }
      }
      this.nutrientAmounts = { ...value };
    }

    /** The AUTHORED serving, kg; `0` = unauthored (see `MaterialApi.servingKgOf`). */
    public getServingKg(): number {
      return this.servingKg;
    }
    public setServingKg(value: number): void {
      this.servingKg = Number.isFinite(value) && value > 0 ? value : 0;
    }

    /** The basic tastes this substance carries (may be empty). */
    public getTastes(): readonly TasteTag[] { return this.tastes; }
    /** Set the basic tastes. Unknown words are dropped — the set is closed. */
    /** ⚠ Throws on an unknown taste or a non-positive amount: never a quiet drop. */
    public setTastes(value: readonly TasteTag[]): void {
      if (!Array.isArray(value)) {
        throw new TypeError('Material.setTastes: expected a list of { type, amount }');
      }
      this.tastes = value.map((tag: TasteTag) => {
        if (!(BASIC_TASTES as readonly string[]).includes(tag?.type) || !(tag.amount > 0)) {
          throw new TypeError(
            `Material.setTastes: '${String(tag?.type)}' needs one of ${BASIC_TASTES.join(', ')} and a positive amount (g/kg)`,
          );
        }
        return { type: tag.type, amount: tag.amount };
      });
    }
  };
}
