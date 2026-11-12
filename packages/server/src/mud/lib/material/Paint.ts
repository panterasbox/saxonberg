/**
 * Paint — ⭐⭐ a MIXTURE whose properties derive from what went into it
 * (paint build D8, 2026-10-31).
 *
 * There is no paint table. A paint is a binder (any material that lays a
 * coat and sets — linseed oil, milk of lime, egg, casein) with pigments
 * suspended in it by mass, and perhaps a thinner. Its color is the
 * pigments' colors weighted by how much of each there is and how well each
 * hides; how well it covers is their hiding power; how it stands the sun is
 * its least lightfast pigment; how thick a coat a litre lays is the share
 * of it that stays behind when it sets. A second paint is a pigment row.
 *
 * The makeup rides the liquid's payload (`BulkPayload.paint`, declared
 * here) from the pot it was stirred in to the coat it was laid as
 * (`CoatLayer.paint`): a wall remembers what it was painted with.
 *
 * A value object — instance methods only.
 */

import type Material from './Material';
import { Colour } from '../perception/Colour';
import type { ColorTag } from '../perception/Light';
import { StuffApi } from '../../api/stuff';
import { MixinApi } from '../../api/mixin';
import { MaterialApi } from '../../api/material';

/** One pigment in a paint, by its share of the pigment mass. */
export interface PaintPigment {
  material: string;
  share: number;
}

/** What a paint is made of — the payload a pot writes and a coat keeps. */
export interface PaintMakeup {
  /** The binder's material path. */
  binder: string;
  /** The pigments, shares summing to `1` (empty: the binder alone). */
  pigments: PaintPigment[];
  /** The share of a litre that stays on the wall when it sets, `0..1`. */
  solidsFraction: number;
  /** A thinner stirred in (turpentine), if any. */
  thinner?: string;
}

declare module '../bulk/Bulkable' {
  interface BulkPayload {
    /** ⭐ This liquid is a paint, and this is what it is made of (paint D8). */
    paint?: PaintMakeup;
  }
}

export class Paint {
  private readonly makeup: PaintMakeup;

  constructor(makeup: PaintMakeup) {
    this.makeup = makeup;
  }

  /** The makeup, as recorded. */
  public getMakeup(): PaintMakeup {
    return this.makeup;
  }

  /** The binder's material, if it is standing. */
  public binder(): Material | null {
    return this.materialAt(this.makeup.binder);
  }

  /**
   * ⭐ The color of a coat of this: each pigment's color weighted by its
   * share × hiding power — an opaque pigment dominates a mix (a little
   * lampblack greys a lot of chalk) — or the binder's own body when there
   * is no pigment in it (a lime is white).
   */
  public colour(faded = 0): Colour {
    const base = this.binderColour();
    let r = 0;
    let g = 0;
    let b = 0;
    let weight = 0;
    for (const p of this.makeup.pigments) {
      const spec = this.pigmentOf(this.materialAt(p.material));
      if (!spec || !(p.share > 0)) continue;
      const fade = Math.min(1, Math.max(0, faded)) * (1 - spec.lightfastness);
      // A fading pigment loses its color toward the white of its ground.
      const w = p.share * spec.hidingPower;
      r += w * (spec.transmitR + (1 - spec.transmitR) * fade);
      g += w * (spec.transmitG + (1 - spec.transmitG) * fade);
      b += w * (spec.transmitB + (1 - spec.transmitB) * fade);
      weight += w;
    }
    if (!(weight > 0)) return base;
    return Colour.of(r / weight, g / weight, b / weight);
  }

  /** The nearest named color — what a look calls it. */
  public colorTag(faded = 0): ColorTag {
    return this.colour(faded).nearestTag();
  }

  /**
   * How well one coat hides what is under it, `0..1` — the pigments'
   * hiding power by share, more pigment in the binder hiding more (a thin
   * wash of ochre shows the wall; a full-bodied oil does not).
   */
  public hidingPower(): number {
    let h = 0;
    for (const p of this.makeup.pigments) {
      const spec = this.pigmentOf(this.materialAt(p.material));
      if (spec && p.share > 0) h += p.share * spec.hidingPower;
    }
    const ownBody = this.pigmentOf(this.binder())?.hidingPower ?? 0;
    return Math.min(1, Math.max(h, ownBody));
  }

  /** How well it stands the sun — its least lightfast pigment (`1` never fades). */
  public lightfastness(): number {
    let least = 1;
    for (const p of this.makeup.pigments) {
      const spec = this.pigmentOf(this.materialAt(p.material));
      if (spec && p.share > 0) least = Math.min(least, spec.lightfastness);
    }
    return least;
  }

  /** The word a look uses for a sound coat — the binder's (*painted*, *limewashed*). */
  public coatWord(): string {
    const binder = this.binder();
    return (binder && MixinApi.hasCoating(binder) ? binder.getCoatWord() : null) ?? 'painted';
  }

  /** Litres it takes to lay a set coat `thicknessM` thick over `areaM2`. */
  public litresFor(areaM2: number, thicknessM: number): number {
    const solids = Math.max(0.05, this.makeup.solidsFraction);
    return (Math.max(0, areaM2) * Math.max(0, thicknessM) * 1000) / solids;
  }

  /** The set thickness `litres` lays over `areaM2`. */
  public thicknessFor(litres: number, areaM2: number): number {
    if (!(areaM2 > 0)) return 0;
    return (Math.max(0, litres) * Math.max(0.05, this.makeup.solidsFraction)) / areaM2 / 1000;
  }

  /**
   * What a look says it is — the binder, the pigment, the color, in words
   * and with no number: *"an ochre-yellow oil paint: yellow ochre in linseed
   * oil"*.
   */
  public words(faded = 0): string {
    const binder = this.binder()?.getName() || 'binder';
    const pigments = this.makeup.pigments
      .filter((p) => p.share > 0)
      .sort((a, b) => b.share - a.share)
      .map((p) => this.materialAt(p.material)?.getName() || 'pigment');
    const color = this.colorTag(faded);
    if (pigments.length === 0) return `${color} ${binder}`;
    const list =
      pigments.length === 1
        ? pigments[0]
        : `${pigments.slice(0, -1).join(', ')} and ${pigments[pigments.length - 1]}`;
    return `${color} paint: ${list} in ${binder}`;
  }

  /** A material's pigment spec, or `null` when it has none (no Coating). */
  private pigmentOf(m: Material | null | undefined) {
    return m && MixinApi.hasCoating(m) ? m.getPigment() : null;
  }

  private binderColour(): Colour {
    const own = this.pigmentOf(this.binder());
    return own ? Colour.of(own.transmitR, own.transmitG, own.transmitB) : Colour.UNDYED;
  }

  private materialAt(path: string): Material | null {
    if (!path) return null;
    try {
      return MaterialApi.materials().peek(path) ?? null;
    } catch {
      return null;
    }
  }
}
