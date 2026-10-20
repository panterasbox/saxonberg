/**
 * CompositionMixin — ⭐ **what is dissolved in THIS piece, and how much.**
 *
 * A `Material` tabulates a composition: what *steel* or *soda glass* is,
 * as a kind. That is a singleton — one row, one answer — so it cannot say
 * how *your* bar came out of *your* furnace, or how much iron *this* lump
 * of cullet carried out of the pot it was cracked from. This mixin is the
 * half that can.
 *
 * The field is `alloying` (the name it shipped with, kept so the two
 * glass rows that author it are untouched) and it speaks the same
 * `{materialPath, fraction}` vocabulary `Material.composition` does.
 * Carbon in iron is `fractionOf('/stuff/idea/material/element/carbon')`;
 * iron in glass is `fractionOf(<iron>)`.
 *
 * ⭐ **Split from temper (2026-10-17, the storage-and-ice build).** A
 * re-meltable lump of glass, wax or ice keeps what was dissolved in it
 * and has NO temper: heat treatment is a fact about steel. So composition
 * is its own claim, {@link TemperedMixin} is the other, and
 * {@link AlloyedMixin} is the two together — what metal stock composes.
 *
 * See [docs/subsystems/materials-response.md].
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { CompositionEntry } from './Material';

// ⭐ A molten pool carries its composition (ceramics ruling C, revision 2):
// declared from the folder that owns the concept (the five-extender
// pattern). Seeded by `doMelt` from the melting piece's alloying, folded by
// volume on every pour, and stamped back onto a `Composition` cast at the
// set — so a green bottle remelted comes back green, and a pig's carbon
// rides the crucible into the ingot.
declare module '../bulk/Bulkable' {
  interface BulkPayload {
    /**
     * What is dissolved in this pool, by mass fraction — the piece's own
     * `alloying`, molten. ⚠ Not `composition`: that name is the drink
     * blend's (`BlendPart[]`).
     */
    alloying?: CompositionEntry[];
  }
}

/** The smallest fraction worth keeping — below this, the entry is dropped. */
const EPSILON = 1e-6;

export interface Composition {
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
  /**
   * ⭐ Fold `entries` in as `massKg` of input against what this piece
   * already is (its current mass), mass-weighted — the arithmetic a mixing
   * vessel and a many-input craft share (ceramics D34).
   */
  absorbComposition(entries: readonly CompositionEntry[], massKg: number, intoKg: number): void;

  // Public so the applier can reflect into it; in-class code reads it
  // directly. Not the inter-Stuff contract (that is the methods).
  alloying: CompositionEntry[];
}

export function CompositionMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class CompositionMixin extends Base implements Composition {
    static _mixinName: string = 'CompositionMixin';

    static fieldMeta: FieldMeta = {
      // ⭐ Level-1 spoiler with `spoilerName: 0` — the `Ore.grade` cut,
      // and for the same reason. THAT a piece has a composition figure is
      // public (a reader should see that the number exists to be
      // measured); what it IS is what `analyze chemistry` earns.
      alloying: { persistent: true, authorable: true, spoiler: 1, spoilerName: 0 },
    };

    /** Empty is the default and the common case — a pure piece dissolves nothing. */
    public alloying: CompositionEntry[] = [];

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

    public absorbComposition(
      entries: readonly CompositionEntry[],
      massKg: number,
      intoKg: number,
    ): void {
      const add = Math.max(0, massKg);
      const have = Math.max(0, intoKg);
      const total = add + have;
      if (!(total > 0)) return;
      const acc = new Map<string, number>();
      for (const e of this.alloying) {
        acc.set(e.materialPath, (acc.get(e.materialPath) ?? 0) + e.fraction * (have / total));
      }
      for (const e of entries ?? []) {
        if (!e || typeof e.materialPath !== 'string') continue;
        acc.set(e.materialPath, (acc.get(e.materialPath) ?? 0) + clamp01(e.fraction) * (add / total));
      }
      this.setAlloying([...acc].map(([materialPath, fraction]) => ({ materialPath, fraction })));
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
  };
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return value < 0 ? 0 : value > 1 ? 1 : value;
}
