/**
 * Colour — a **subtractive** colour, and the arithmetic that makes
 * overdyeing work.
 *
 * ⭐⭐ **Stored as TRANSMITTANCE, not as RGB, and that is the whole
 * point.** Dye is subtractive: a yellow dye is a thing that absorbs
 * blue, and a blue dye is a thing that absorbs red. Put one over the
 * other and what survives is green — which is how green was actually
 * made for four thousand years, and it needs no table row.
 *
 * ⚠⚠ **RGB gets exactly this case wrong, which is why it is not the
 * storage.** RGB is *additive*. Blue over yellow added is white
 * (`0,0,255` + `255,255,0`); multiplied as bytes it is black. Neither
 * is green, and "blue over yellow is green" is the one claim the dye
 * model makes. Transmittance multiplies — `0.15·1.0, 1.0·0.5,
 * 1.0·0.15` → a green — because that is what layered filters do.
 *
 * ⭐ So RGB exists here only as an **edge conversion**: {@link toHex}
 * is for the wire and the client swatch. Nothing composes in RGB.
 *
 * ## Why a value object beside `Light`
 *
 * `Light.ts` reserved `ColorTag` for *"the abstraction layer above
 * color temperature… new abstract-color concepts plug in here"*. This
 * is that layer's arithmetic: `ColorTag` stays the WORD, and `Colour`
 * is the position the word is looked up from. A colour temperature is
 * still `Quantity<'K'>` and has nothing to do with this — a
 * blackbody's colour and a dye's colour are different physics and the
 * two must not be made to share a type.
 *
 * ⚠ Immutable. Every operation returns a new `Colour`, so a stack can
 * be folded without anybody owning a mutable accumulator.
 */

import { DYE_COLOR_TAGS } from '@saxonberg/types';
import type { ColorTag } from './Light';

/**
 * Linear light → sRGB, the standard piecewise transfer.
 *
 * ⚠ The reason a colour model needs this at all: everything above
 * composes in LINEAR light, because that is the domain where filters
 * multiply. Display bytes are encoded. Skipping the conversion is the
 * single most common way a physically-correct colour pipeline produces
 * visibly wrong output.
 */
function encodeSrgb(v: number): number {
  const t = unit(v);
  return t <= 0.0031308 ? 12.92 * t : 1.055 * Math.pow(t, 1 / 2.4) - 0.055;
}

/** Clamp to the unit interval; NaN reads as 0 rather than propagating. */
function unit(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/**
 * One named point in the palette, for the nearest-neighbour lookup.
 *
 * ⚠ These are the WORDS, not the dyes. A dye row authors where it
 * lands; this table only says what to call wherever it landed, which
 * is why an overdyed purple nobody authored still gets named.
 */
interface PaletteEntry {
  readonly tag: ColorTag;
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

/**
 * ⭐ Deliberately SMALL and deliberately MUTED. These are the words a
 * person standing in a medieval street would use, and the palette a
 * natural-dye economy actually produces — see textiles.md on why the
 * muted range is a finding rather than a limitation. A brilliant
 * colour is what magic buys you, and it fades.
 *
 * Ordered light → dark within a family only for readability; the
 * lookup is nearest-neighbour and does not care.
 */
const PALETTE: readonly PaletteEntry[] = [
  // The undyed / barely-dyed end.
  { tag: 'white', r: 0.96, g: 0.96, b: 0.94 },
  { tag: 'cream', r: 0.94, g: 0.9, b: 0.78 },
  { tag: 'oatmeal', r: 0.86, g: 0.82, b: 0.72 },
  { tag: 'fawn', r: 0.8, g: 0.71, b: 0.55 },
  { tag: 'grey', r: 0.55, g: 0.55, b: 0.55 },
  { tag: 'black', r: 0.09, g: 0.09, b: 0.1 },
  /*
   * ⭐⭐ The PALE band, and it is load-bearing rather than decorative.
   * A bath tops out around strength 0.8 and a vat builds from 0.35, so
   * most real cloth lands LIGHT — and a palette of saturated words only
   * would answer "grey" for a perfectly good pale blue, because grey is
   * genuinely the nearest saturated thing to it. The palette has to
   * span what the dyes can REACH, not what a colour wheel contains.
   */
  { tag: 'pale blue', r: 0.5, g: 0.64, b: 0.84 },
  { tag: 'sage', r: 0.62, g: 0.68, b: 0.55 },
  { tag: 'straw', r: 0.88, g: 0.82, b: 0.55 },
  { tag: 'dusty rose', r: 0.82, g: 0.6, b: 0.58 },
  { tag: 'slate', r: 0.45, g: 0.5, b: 0.58 },
  // The saturated end — reachable by a strong bath or repeated dips.
  { tag: 'brown', r: 0.45, g: 0.31, b: 0.18 },
  { tag: 'russet', r: 0.6, g: 0.32, b: 0.18 },
  { tag: 'red', r: 0.72, g: 0.16, b: 0.16 },
  { tag: 'maroon', r: 0.4, g: 0.13, b: 0.17 },
  { tag: 'pink', r: 0.87, g: 0.6, b: 0.62 },
  { tag: 'orange', r: 0.82, g: 0.47, b: 0.16 },
  { tag: 'gold', r: 0.8, g: 0.65, b: 0.24 },
  { tag: 'yellow', r: 0.88, g: 0.82, b: 0.3 },
  { tag: 'olive', r: 0.5, g: 0.48, b: 0.22 },
  { tag: 'green', r: 0.3, g: 0.5, b: 0.28 },
  { tag: 'teal', r: 0.24, g: 0.47, b: 0.46 },
  { tag: 'blue', r: 0.22, g: 0.31, b: 0.55 },
  { tag: 'indigo', r: 0.19, g: 0.2, b: 0.42 },
  { tag: 'purple', r: 0.38, g: 0.24, b: 0.45 },
  { tag: 'violet', r: 0.48, g: 0.35, b: 0.6 },
];

export class Colour {
  /**
   * The words this palette can produce — for the cross-package drift
   * check. ⚠ Must equal `DYE_COLOR_TAGS`, which is what the client
   * maps onto its eight tints; an unlisted word renders neutral
   * silently, so the two ends assert against each other.
   */
  static tags(): readonly ColorTag[] {
    return PALETTE.map((e) => e.tag);
  }

  /** The shared vocabulary this palette must cover. */
  static sharedTags(): readonly string[] {
    return DYE_COLOR_TAGS;
  }

  /** Undyed — transmits everything, absorbs nothing. */
  static readonly UNDYED = new Colour(1, 1, 1);

  readonly r: number;
  readonly g: number;
  readonly b: number;

  private constructor(r: number, g: number, b: number) {
    this.r = unit(r);
    this.g = unit(g);
    this.b = unit(b);
  }

  /** Build from three transmittances in `0..1`. */
  static of(r: number, g: number, b: number): Colour {
    return new Colour(r, g, b);
  }

  /**
   * ⭐⭐ Lay this colour OVER another — the subtractive product, which
   * is the whole model in one line.
   *
   * Weld transmits `(1.0, 1.0, 0.15)` and woad transmits
   * `(0.15, 0.5, 1.0)`; the product is `(0.15, 0.5, 0.15)`, a green
   * that nobody authored and no row contains.
   */
  over(base: Colour): Colour {
    return new Colour(this.r * base.r, this.g * base.g, this.b * base.b);
  }

  /**
   * ⭐ This colour applied at `strength` — the lerp back toward
   * transmitting everything.
   *
   * **Fading is desaturation, for free.** A washed-out application
   * approaches `UNDYED` continuously, so cloth walks back toward the
   * fibre rather than falling off a legibility cliff. At `strength` 0
   * this is the identity for {@link over}, which is why a mordanted
   * but undyed piece (strength 0, on purpose) correctly shows nothing.
   */
  atStrength(strength: number): Colour {
    const s = unit(strength);
    return new Colour(
      1 - s * (1 - this.r),
      1 - s * (1 - this.g),
      1 - s * (1 - this.b),
    );
  }

  /**
   * Fold a stack, oldest first, over a base. The identity for an empty
   * stack is the base itself, so an undyed thing needs no special case.
   */
  static stack(layers: readonly Colour[], base: Colour = Colour.UNDYED): Colour {
    let out = base;
    for (const layer of layers) out = layer.over(out);
    return out;
  }

  /**
   * **How much dye is on it**, `0..1` — the deepest absorption on any
   * one band. 0 is undyed; 1 is a band taken out completely.
   *
   * ⚠⚠ **This is NOT saturation, and it was called that for one
   * commit.** Saturation in every standard colour model measures
   * distance from GREY; this measures distance from UNDYED. A neutral
   * grey dye scores 0 on saturation and 0.5 here, and the two readings
   * come apart exactly when somebody overdyes into mud. The name was
   * the only wrong thing — every call site wanted dye load — but a
   * method called `saturation` will eventually be read as saturation
   * and used to answer a question it cannot answer.
   *
   * ⚠ Deliberately the MAX channel absorption rather than a mean: a
   * strong blue is deeply dyed even though it still passes plenty of
   * blue, and a mean would call it half-dyed.
   */
  depth(): number {
    return Math.max(1 - this.r, 1 - this.g, 1 - this.b);
  }

  /**
   * How much light comes back overall, `0..1` — the dark/light read
   * that {@link depth} deliberately is not.
   *
   * ⚠ The two are independent and the difference bites: alum-madder
   * and iron-madder absorb green equally hard, so they have the SAME
   * `depth`, and what separates them is that iron transmits far less
   * red. "How much dye is on it" and "is it dark" are different
   * questions and a single number cannot answer both.
   */
  lightness(): number {
    return (this.r + this.g + this.b) / 3;
  }

  /**
   * ⭐ The nearest palette WORD. Nearest-neighbour in the cube, which
   * is crude and correct for the job: the palette is prose, and the
   * arithmetic already happened.
   *
   * ⚠ Euclidean in linear transmittance, NOT perceptual. A perceptual
   * space (CIELAB and a ΔE) would pick better words at the margins and
   * would be the right upgrade if the words start reading wrong — but
   * it is a bigger dependency than a naming table is worth, and being
   * wrong here costs an adjective rather than a mechanic.
   */
  nearestTag(): ColorTag {
    let best = PALETTE[0]!;
    let bestD = Number.POSITIVE_INFINITY;
    for (const entry of PALETTE) {
      const dr = this.r - entry.r;
      const dg = this.g - entry.g;
      const db = this.b - entry.b;
      const d = dr * dr + dg * dg + db * db;
      if (d < bestD) {
        bestD = d;
        best = entry;
      }
    }
    return best.tag;
  }

  /**
   * `#rrggbb` — the ONE place RGB appears, and it is an output.
   *
   * ⚠⚠ **Gamma-encoded, and the naive version was wrong.** These
   * transmittances are LINEAR light: 0.5 means half the photons in
   * that band get through. An sRGB byte is not linear — it carries the
   * ~2.2 display transfer — so writing `Math.round(t * 255)` treats a
   * linear value as though it were already encoded and renders every
   * colour far too dark (0.5 linear became `0x80`; it should be
   * `0xBC`). Cloth would have looked muddy and the cause would have
   * been invisible, because "natural dyes are muted" is exactly the
   * answer the model is *supposed* to give.
   *
   * The full sRGB piecewise transfer rather than a `pow(1/2.2)`
   * approximation — it is four lines and it is the actual standard.
   *
   * ⚠ Still not a radiometric claim: a lit surface returning what it
   * does not absorb is the right shape for a swatch and nothing more.
   * No illuminant, no white balance, no spectral upsampling.
   */
  toHex(): string {
    const byte = (v: number): string =>
      Math.round(encodeSrgb(v) * 255)
        .toString(16)
        .padStart(2, '0');
    return `#${byte(this.r)}${byte(this.g)}${byte(this.b)}`;
  }

  /**
   * ⭐ The same colour seen in dim light — desaturated toward grey.
   *
   * **Not a stylistic choice: scotopic vision genuinely is colourless.**
   * `factor` 1 is full daylight colour, 0 is fully achromatic. It is
   * what keeps a swatch from being more informative than your eyes,
   * which is the whole reason the render gates on light.
   */
  dimmed(factor: number): Colour {
    const f = unit(factor);
    const grey = (this.r + this.g + this.b) / 3;
    return new Colour(
      grey + (this.r - grey) * f,
      grey + (this.g - grey) * f,
      grey + (this.b - grey) * f,
    );
  }
}
