/**
 * AlloyedMixin — ⭐ **what is dissolved in THIS piece of metal, and how
 * much.**
 *
 * A `Material` tabulates a composition: what *steel* is, as a kind. That
 * is the right home for the kind, and it is a singleton — one row, one
 * answer, shared by every object made of it. So it cannot say how *your*
 * bar came out of *your* furnace, and for the metal chain that is the
 * only number that matters.
 *
 * ⭐⭐ **Carbon is the one number the whole ferrous ladder turns on**,
 * and every rung of it is the same iron with a different amount of
 * carbon in it:
 *
 * | carbon | what you have | why |
 * |---|---|---|
 * | ~0.05 % | a **bloom** — spongy, slag-shot, solid-state | reduced, never melted |
 * | 0.2–2 % | **steel** | the band, and historically the hardest thing to hit on purpose |
 * | 3–4 % | **cast iron** | carbon LOWERS iron's melting point, so it ran liquid — and it is unforgeable |
 *
 * Nobody authored that ladder. It is one scalar and two thresholds, and
 * the furnace computes the scalar from the charge's fuel ratio and the
 * heat it was held at.
 *
 * ⭐ **Named for what it is, not for its first consumer.** The field is
 * `alloying` and it speaks the same `{materialPath, fraction}`
 * vocabulary `Material.composition` already does, so the tin in a bronze
 * (Stage C) is this field and not a second one. Carbon is simply
 * `fractionOf('/stuff/idea/material/element/carbon')`.
 *
 * ## Where it composes, and what that claims
 *
 * **Metal stock only** — `Ingot`, `Casting`, and the smelting pack's
 * `Bloom`. What composing it claims of everything else on those hosts is
 * *"this piece can say how its minor constituents came out"*, which is
 * true of a copper ingot (and empty by default), true of a frozen pool
 * (it keeps what was dissolved in it), and true of a bloom.
 *
 * ⚠ **Not on `Weapon` or `Garment`**, and the test is the standing one:
 * if a guard is needed to re-narrow the host set, the host is wrong.
 * A blade's metal is its `Material` ROW — the row the stock's carbon
 * band chose — and every reader downstream (material height, the
 * covering fold, `repair`, `salvage`, recipe matching) reads that row
 * and learns nothing new. Carbon on a blade would force both mint paths
 * to guard `isAlloyed(output)` on every mint, and would claim a linen
 * shirt can alloy.
 *
 * ⚠ **Not a per-instance `composition` override**, either: that collides
 * with what `Material.composition` means and with every reader that
 * walks it. The minor constituents are a separate list, and
 * {@link Alloyed.getEffectiveComposition} is where the two meet.
 *
 * See [docs/subsystems/materials-response.md].
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { CompositionEntry } from './Material';

/**
 * What a heat treatment left in the metal.
 *
 * ⚠ Recorded and reported, with no mechanical consumer yet — `analyze
 * chemistry` prints it and the next `heat` anneals it back to `none`,
 * because heating past the critical temperature is what annealing IS.
 * The honest larger version (temper into `materialScale`, and onto the
 * made thing rather than the stock) is the crafting-stamp seam.
 */
export type Temper = 'none' | 'hardened';

/** The smallest fraction worth keeping — below this, the entry is dropped. */
const EPSILON = 1e-6;

export interface Alloyed {
  /** The minor constituents dissolved in this piece, by mass fraction. */
  getAlloying(): readonly CompositionEntry[];
  /** Replace the whole list (clamped, normalised, zero entries dropped). */
  setAlloying(entries: readonly CompositionEntry[]): void;
  /** How much of `materialPath` is in this piece, `[0, 1]`. */
  fractionOf(materialPath: string): number;
  /** Set one constituent's fraction; `0` removes it. */
  setFractionOf(materialPath: string, fraction: number): void;
  /**
   * The material's kind-composition scaled by what is left after the
   * alloying, plus the alloying entries. Sums to 1 for a material that
   * authored a composition summing to 1.
   */
  getEffectiveComposition(): CompositionEntry[];
  /** What a heat treatment left in it. */
  getTemper(): Temper;
  setTemper(temper: Temper): void;

  // Public so the Hydrator can reflect into them; in-class code reads
  // them directly. Not the inter-Stuff contract (that is the methods).
  alloying: CompositionEntry[];
  temper: Temper;
}

export function AlloyedMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class AlloyedMixin extends Base implements Alloyed {
    static _mixinName: string = 'AlloyedMixin';

    static fieldMeta: FieldMeta = {
      // ⭐ Level-1 spoiler with `spoilerName: 0` — the `Ore.grade` cut,
      // and for the same reason. THAT a bar has a carbon figure is
      // public (a reader should see that the number exists to be
      // measured); what it IS is what `analyze chemistry` earns.
      alloying: { persistent: true, authorable: true, spoiler: 1, spoilerName: 0 },
      temper: { persistent: true, authorable: true, spoiler: 1, spoilerName: 0 },
    };

    /** Empty is the default and the common case — a pure bar alloys nothing. */
    public alloying: CompositionEntry[] = [];
    public temper: Temper = 'none';

    // ---------- reads ----------

    public getAlloying(): readonly CompositionEntry[] {
      return this.alloying;
    }

    public fractionOf(materialPath: string): number {
      return this.alloying.find((e) => e.materialPath === materialPath)?.fraction ?? 0;
    }

    public getEffectiveComposition(): CompositionEntry[] {
      const minor = this.alloying.filter((e) => e.fraction > EPSILON);
      const dissolved = minor.reduce((sum, e) => sum + e.fraction, 0);
      const host = (this as unknown as {
        getMaterial?(): { getComposition?(): readonly CompositionEntry[] } | null;
      }).getMaterial?.();
      const kind = host?.getComposition?.() ?? [];
      const remainder = Math.max(0, 1 - dissolved);
      // ⚠ A pure element authors an EMPTY composition, so there is
      // nothing to scale and the alloying entries are the whole answer
      // that this can honestly give. Saying "iron 0.994, carbon 0.006"
      // would mean inventing the host entry the row deliberately omits.
      const scaled = kind.map((e) => ({
        materialPath: e.materialPath,
        fraction: e.fraction * remainder,
      }));
      return [...scaled, ...minor];
    }

    public getTemper(): Temper {
      return this.temper;
    }

    // ---------- writes ----------

    public setAlloying(entries: readonly CompositionEntry[]): void {
      const out: CompositionEntry[] = [];
      for (const entry of entries ?? []) {
        if (!entry || typeof entry.materialPath !== 'string') continue;
        const fraction = clamp01(entry.fraction);
        if (fraction <= EPSILON) continue;
        const existing = out.find((e) => e.materialPath === entry.materialPath);
        if (existing) existing.fraction = clamp01(existing.fraction + fraction);
        else out.push({ materialPath: entry.materialPath, fraction });
      }
      this.alloying = out;
    }

    public setFractionOf(materialPath: string, fraction: number): void {
      if (typeof materialPath !== 'string' || materialPath.length === 0) return;
      const value = clamp01(fraction);
      const rest = this.alloying.filter((e) => e.materialPath !== materialPath);
      // ⚠ Zero REMOVES rather than storing a zero: the sparse default is
      // an empty list, and a bar that was carburized and then melted
      // back down should read exactly like one that never was.
      this.alloying = value <= EPSILON ? rest : [...rest, { materialPath, fraction: value }];
    }

    public setTemper(temper: Temper): void {
      this.temper = temper === 'hardened' ? 'hardened' : 'none';
    }
  };
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return value < 0 ? 0 : value > 1 ? 1 : value;
}
