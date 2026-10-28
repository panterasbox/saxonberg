/**
 * CompositionMixin — ⭐ **what THIS piece is made of, by mass fraction.**
 *
 * A `Material` tabulates a composition: what *steel* or *soda glass* is,
 * as a kind. That is a singleton — one row, one answer — so it cannot say
 * how *your* bar came out of *your* furnace, how much iron *this* lump of
 * cullet carried out of the pot it was cracked from, or how much bran is
 * in *this* loaf. This mixin is the half that can.
 *
 * The field is `makeup` and it speaks the same `{materialPath, fraction}`
 * vocabulary `Material.composition` does — the KIND's, which keeps its
 * name. Carbon in iron is `fractionOf('/stuff/idea/material/element/carbon')`;
 * iron in glass is `fractionOf(<iron>)`; bran in a loaf is
 * `fractionOf(<bran>)`.
 *
 * ⭐⭐ **One record, by mass, stored as FRACTIONS (ceramics re-plan R1-D1).**
 * A part's absolute mass is `fraction × hostKg` — a piece's `getMass()`, a
 * pool's `litres × density`. Fractions are intensive, which is why the
 * record survives every pour, draw, split and top-up unchanged: a half
 * pot poured off is made of exactly what the whole pot was. Servings are
 * never stored; they DERIVE at the read (`MaterialApi.servingsOf`). This
 * absorbed `ComposedMixin`, which carried a food's parts as absolute
 * servings and so could not survive a pour; a minor constituent (carbon
 * in a bar) and a part (bran in a loaf) are the same record, and
 * {@link Composition.effectiveMakeup} reads both the same way.
 *
 * ⭐ **Split from temper (2026-10-17, the storage-and-ice build).** A
 * re-meltable lump of glass, wax or ice keeps what was dissolved in it
 * and has NO temper: heat treatment is a fact about steel. So composition
 * is its own claim, {@link TemperedMixin} is the other, and
 * {@link AlloyedMixin} is the two together — what metal stock composes.
 * And `Provision` composes it alone: **every food can be made of parts.**
 *
 * See [docs/subsystems/materials-response.md] + [bulk.md].
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { CompositionEntry } from './Material';

// ⭐ A pool carries its makeup (ceramics ruling C, revision 2; one record
// since re-plan R1): declared from the folder that owns the concept (the
// five-extender pattern), so `lib/bulk` never imports `lib/material`'s
// vocabulary. Seeded by `doMelt` from the melting piece's makeup and by a
// craft from what went in, folded by volume on every pour, and stamped
// back onto a `Composition` cast at the set — so a green bottle remelted
// comes back green, a pig's carbon rides the crucible into the ingot, and
// a stew poured into a pot of stew keeps its ingredients.
declare module '../bulk/Bulkable' {
  interface BulkPayload {
    /**
     * What this pool is made of, by mass fraction of the pool — the
     * piece's own `makeup`, poured or molten. Intensive, so a pour carries
     * it unchanged and a top-up folds it by volume.
     */
    makeup?: CompositionEntry[];
  }
}

/** The smallest fraction worth keeping — below this, the entry is dropped. */
const EPSILON = 1e-6;

export interface Composition {
  /** What this piece is made of, by mass fraction; empty = only its Material speaks. */
  getMakeup(): readonly CompositionEntry[];
  /** Replace the whole list (clamped, duplicates summed, zero entries dropped). */
  setMakeup(entries: readonly CompositionEntry[]): void;
  /** How much of `materialPath` is in this piece, `[0, 1]`. */
  fractionOf(materialPath: string): number;
  /** Set one constituent's fraction; `0` removes it. */
  setFractionOf(materialPath: string, fraction: number): void;
  /**
   * The material's kind-composition scaled by what is left after the
   * makeup, plus the makeup entries. Sums to 1 for a material that
   * authored a composition summing to 1, and is exactly the makeup for a
   * piece whose makeup already sums to 1 (a loaf of flour and bran).
   */
  effectiveMakeup(): CompositionEntry[];
  /**
   * ⭐ Fold `entries` in as `massKg` of input against what this piece
   * already is (its current mass), mass-weighted — the arithmetic a mixing
   * vessel and a many-input craft share (ceramics D34).
   */
  absorbMakeup(entries: readonly CompositionEntry[], massKg: number, intoKg: number): void;

  // Public so the applier can reflect into it; in-class code reads it
  // directly. Not the inter-Stuff contract (that is the methods).
  makeup: CompositionEntry[];
}

export function CompositionMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class CompositionMixin extends Base implements Composition {
    static _mixinName: string = 'CompositionMixin';

    static fieldMeta: FieldMeta = {
      // ⭐ Level-1 spoiler with `spoilerName: 0` — the `Ore.grade` cut,
      // and for the same reason. THAT a piece has a composition figure is
      // public (a reader should see that the number exists to be
      // measured); what it IS is what `analyze chemistry` earns.
      makeup: { persistent: true, authorable: true, spoiler: 1, spoilerName: 0 },
    };

    /**
     * Empty is the default and the common case — a pure piece dissolves
     * nothing, and a raw cut of meat is not *made of* anything, it simply
     * IS its material.
     *
     * ⚠ Authorable: a row may state its own makeup, which is how an NPC
     * counter can stock a white loaf before any player has milled flour.
     * That is one row's authored parts, not a band — a player's own loaf
     * comes out of the chain with no row at all.
     */
    public makeup: CompositionEntry[] = [];

    // ---------- reads ----------

    public getMakeup(): readonly CompositionEntry[] {
      return this.makeup;
    }

    public fractionOf(materialPath: string): number {
      return this.makeup.find((e) => e.materialPath === materialPath)?.fraction ?? 0;
    }

    public effectiveMakeup(): CompositionEntry[] {
      const minor = this.makeup.filter((e) => e.fraction > EPSILON);
      const dissolved = minor.reduce((sum, e) => sum + e.fraction, 0);
      const host = (this as unknown as {
        getMaterial?(): { getComposition?(): readonly CompositionEntry[] } | null;
      }).getMaterial?.();
      const kind = host?.getComposition?.() ?? [];
      const remainder = Math.max(0, 1 - dissolved);
      // ⚠ A pure element authors an EMPTY composition, so there is
      // nothing to scale and the makeup entries are the whole answer
      // that this can honestly give. Saying "iron 0.994, carbon 0.006"
      // would mean inventing the host entry the row deliberately omits.
      const scaled = kind.map((e) => ({
        materialPath: e.materialPath,
        fraction: e.fraction * remainder,
      }));
      return [...scaled, ...minor];
    }

    // ---------- writes ----------

    public setMakeup(entries: readonly CompositionEntry[]): void {
      const out: CompositionEntry[] = [];
      for (const entry of entries ?? []) {
        if (!entry || typeof entry.materialPath !== 'string' || entry.materialPath.length === 0) continue;
        const fraction = clamp01(entry.fraction);
        if (fraction <= EPSILON) continue;
        const existing = out.find((e) => e.materialPath === entry.materialPath);
        if (existing) existing.fraction = clamp01(existing.fraction + fraction);
        else out.push({ materialPath: entry.materialPath, fraction });
      }
      this.makeup = out;
    }

    public absorbMakeup(
      entries: readonly CompositionEntry[],
      massKg: number,
      intoKg: number,
    ): void {
      const add = Math.max(0, massKg);
      const have = Math.max(0, intoKg);
      const total = add + have;
      if (!(total > 0)) return;
      const acc = new Map<string, number>();
      for (const e of this.makeup) {
        acc.set(e.materialPath, (acc.get(e.materialPath) ?? 0) + e.fraction * (have / total));
      }
      for (const e of entries ?? []) {
        if (!e || typeof e.materialPath !== 'string') continue;
        acc.set(e.materialPath, (acc.get(e.materialPath) ?? 0) + clamp01(e.fraction) * (add / total));
      }
      this.setMakeup([...acc].map(([materialPath, fraction]) => ({ materialPath, fraction })));
    }

    public setFractionOf(materialPath: string, fraction: number): void {
      if (typeof materialPath !== 'string' || materialPath.length === 0) return;
      const value = clamp01(fraction);
      const rest = this.makeup.filter((e) => e.materialPath !== materialPath);
      // ⚠ Zero REMOVES rather than storing a zero: the sparse default is
      // an empty list, and a bar that was carburized and then melted
      // back down should read exactly like one that never was.
      this.makeup = value <= EPSILON ? rest : [...rest, { materialPath, fraction: value }];
    }
  };
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return value < 0 ? 0 : value > 1 ? 1 : value;
}
