/**
 * Dyestuff — what a dye row IS, as reference data.
 *
 * ⭐⭐ **Authors author DYES, not colours.** A dyed thing stores the
 * application stack and never a colour word; the colour it *reads* as
 * derives. What this row carries is the position each
 * `(dyestuff, mordant)` pair lands at in a small colour space — so
 * **overdyeing is arithmetic** (blue over yellow *is* green, not a
 * table row), **fading is desaturation**, and the palette is only a
 * lookup for prose.
 *
 * ## ⚠⚠ Two chemistries, and the row says which
 *
 * `chemistry: mordant` — alizarin and luteolin need a metal ion to
 * bind, so the mordant decides the colour family before anyone can see
 * it, and an un-mordanted piece washes straight out.
 *
 * `chemistry: vat` — indigotin does not dissolve. It is reduced in an
 * alkaline, oxygen-poor vat and **oxidised in the air** afterwards, and
 * it takes **no mordant at all**. A mordant applied before a woad vat
 * is wasted alum, and the trade refuses it rather than silently
 * ignoring it — because the point is that dyeing is two chemistries.
 *
 * ⭐ The asymmetry worth knowing: **mordant dyes EXHAUST** (first dip
 * deep, second paler) and **vat dyes ACCUMULATE** (each dip builds
 * depth). Two chemistries, two opposite bath behaviours, one verb.
 */

import { Idea } from '@saxonberg/server/mud/lib/stuff/Idea';
import { SingletonMixin } from '@saxonberg/server/mud/lib/stuff/Singleton';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { VetoResult } from '@saxonberg/server/mud/lib/errors';
import type { EvictionContext } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';

/** One `(mordant → outcome)` row of the shade table. */
export interface Shade {
  /** The mordant key this outcome belongs to (`''` for a vat dye). */
  mordant: string;
  /**
   * The prose phrase the VAT SCENE says as the cloth comes out — *"a
   * clear red"*.
   *
   * ⚠ This is a sentence, not the colour. What the cloth reads as
   * afterwards is derived from the triple below and named by the
   * kernel palette, so an overdyed piece gets a word nobody wrote here.
   */
  colour: string;
  /**
   * How well the bond holds, `0..1`. ⭐ This is the CRAFT's half: the
   * dyestuff decides the hue, the mordant decides how long you keep it.
   */
  fastness: number;
  /**
   * ⭐⭐ Where this `(dyestuff, mordant)` pair LANDS — what it
   * transmits per channel, `0..1`. Subtractive, so a yellow dye is one
   * that passes red and green and eats blue.
   *
   * This is the "position in a small colour space" the model always
   * claimed and never had. It is copied onto the cloth at dye time,
   * and the stack multiplies — which is what makes **blue over yellow
   * actually green** instead of whichever was stronger.
   *
   * ⚠ Four independent entries per dye, NOT one hue under a per-mordant
   * filter. That is chemistry, not laziness: the metal ion is part of
   * the chromophore complex, so alizarin-alum (a clear red lake) and
   * alizarin-iron (a purple-brown one) are genuinely different
   * pigments. "Iron saddens everything" would be tidier and false.
   */
  transmitR: number;
  transmitG: number;
  transmitB: number;
}

export default class Dyestuff extends SingletonMixin(Idea) {
  /** Reference data read synchronously by `dye`; never culled. */
  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: 'dyestuff singleton; never culled' };
  }

  static fieldMeta: FieldMeta = {
    key: { persistent: true, authorable: true },
    materialPath: { persistent: true, authorable: true },
    chemistry: { persistent: true, authorable: true },
    shades: { persistent: true, authorable: true },
  };

  /** The stable key (`madder`). */
  public key = '';
  /** The material a dye bath consumes — ⚠ the chain's entry point. */
  public materialPath = '';
  /** `mordant` or `vat`. */
  public chemistry: 'mordant' | 'vat' = 'mordant';
  /** The outcome per mordant. A vat dye carries exactly one, keyed `''`. */
  public shades: Shade[] = [];

  getKey(): string {
    return this.key;
  }
  setKey(value: string): void {
    if (!value) throw new RangeError('Dyestuff.setKey: key must be non-empty');
    this.key = value;
  }

  getMaterialPath(): string {
    return this.materialPath;
  }
  setMaterialPath(value: string): void {
    this.materialPath = value;
  }

  getChemistry(): 'mordant' | 'vat' {
    return this.chemistry;
  }
  setChemistry(value: 'mordant' | 'vat'): void {
    if (value !== 'mordant' && value !== 'vat') {
      throw new RangeError(
        `Dyestuff.setChemistry: expected 'mordant' | 'vat', got ${String(value)}`,
      );
    }
    this.chemistry = value;
  }

  getShades(): readonly Shade[] {
    return this.shades;
  }
  setShades(value: Shade[]): void {
    if (!Array.isArray(value)) {
      throw new TypeError('Dyestuff.setShades: must be an array');
    }
    for (const s of value) {
      if (!Number.isFinite(s?.fastness) || s.fastness < 0 || s.fastness > 1) {
        throw new RangeError(
          `Dyestuff.setShades: fastness ${s?.fastness} is outside 0..1`,
        );
      }
      /*
       * ⚠ REQUIRED here, unlike on the cloth. An authored dye row with
       * no position is a dye that cannot be mixed, and it would fail
       * silently — the cloth would simply come out uncoloured and
       * nobody would know which row was wrong. A row is authored once;
       * a refusal at hydrate is the cheap place to find out.
       */
      for (const k of ['transmitR', 'transmitG', 'transmitB'] as const) {
        const v = s?.[k];
        if (!Number.isFinite(v) || v < 0 || v > 1) {
          throw new RangeError(
            `Dyestuff.setShades: ${k} ${v} is outside 0..1 (mordant '${s?.mordant}')`,
          );
        }
      }
    }
    this.shades = value.map((s) => ({ ...s }));
  }

  /**
   * The outcome for a mordant, or `null` when this dyestuff will not
   * take it.
   *
   * ⚠ A **vat** dye returns its single outcome for the empty mordant
   * and `null` for every real one — which is what makes "a mordant
   * applied to woad is refused, not silently ignored" fall out of the
   * data rather than out of a special case in the verb.
   */
  public shadeFor(mordant: string): Shade | null {
    return this.shades.find((s) => s.mordant === mordant) ?? null;
  }

  /** Find the shipped dyestuff a material path belongs to. */
  public static forMaterial(materialPath: string): Dyestuff | null {
    for (const d of Dyestuff.all()) {
      if (d.getMaterialPath() === materialPath) return d;
    }
    return null;
  }

  /**
   * Every live dyestuff row, from **every root's** `idea/dyestuff/`
   * subtree — a stateless glob over the live population, so there is no
   * cache to invalidate and HMR cannot leave a stale roster.
   *
   * ⚠ `/**\/idea/dyestuff/*` rather than this pack's own prefix: a
   * second dye pack (a chemical-industry one shipping synthetic
   * alizarin, say) must join the roster without this file changing.
   */
  public static all(): Dyestuff[] {
    return StuffApi.findByPathGlob<Dyestuff>('/**/idea/dyestuff/*').filter(
      (d): d is Dyestuff => d instanceof Dyestuff,
    );
  }
}
