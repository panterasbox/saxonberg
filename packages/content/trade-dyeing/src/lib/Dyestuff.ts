/**
 * Dyestuff — what a dye IS, as the `dyestuff` document reads into
 * (load-on-use W3: a document named by its path, `/trade/dyeing/dyestuffs/madder`,
 * served by `DyestuffCatalogue` and found by the material it dyes with).
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

/** One `(mordant → outcome)` row of the shade table. */
export interface ShadeAvatar {
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

/** The two ways a dye binds (the class docstring). */
export type DyeChemistry = 'mordant' | 'vat';

export default class Dyestuff {
  constructor(
    /** The document's path (`/trade/dyeing/dyestuffs/madder`). */
    private readonly path: string,
    /** The material a dye bath consumes — ⚠ the chain's entry point. */
    private readonly material: string,
    /** `mordant` or `vat`. */
    private readonly chemistry: DyeChemistry,
    /** The outcome per mordant. A vat dye carries exactly one, keyed `''`. */
    private readonly shades: readonly ShadeAvatar[],
  ) {}

  /** The document's path. */
  getPath(): string {
    return this.path;
  }

  /** The stable key — the document's leaf (`madder`). */
  getKey(): string {
    return this.path.slice(this.path.lastIndexOf('/') + 1);
  }

  /** The material a dye bath of this dyestuff holds. */
  getMaterialPath(): string {
    return this.material;
  }

  getChemistry(): DyeChemistry {
    return this.chemistry;
  }

  getShades(): readonly ShadeAvatar[] {
    return this.shades;
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
  public shadeFor(mordant: string): ShadeAvatar | null {
    return this.shades.find((s) => s.mordant === mordant) ?? null;
  }
}
