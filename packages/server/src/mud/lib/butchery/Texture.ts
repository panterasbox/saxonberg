/**
 * Texture — what a cut's muscle work means for the pot.
 *
 * ⭐⭐⭐ **The law the whole butchery chain exists to teach, in one
 * object.** A muscle that works constantly carries connective tissue;
 * collagen gelatinizes only under long, moist heat, and dissolves into
 * gelatin that makes a braise unctuous. A muscle that barely works has
 * almost none, so long cooking only drives the water out of it. So:
 *
 * - a **tough** cut wants `long-moist` — hours, in liquid, below boiling;
 * - a **tender** cut wants `fast-dry` — minutes, hot, no water;
 * - a **middling** cut forgives either and excels at neither.
 *
 * ⭐ It is real food science and it is **predictable without a table**: a
 * player who knows a shoulder works and a loin does not can say which one
 * wants the pot and be right. That is the Andy Weir property this
 * platform's pedagogy lens asks for.
 *
 * ⚠ **A CONSTRUCTED value object, with no statics.** `lint:lib-statics`
 * holds a ceiling that may fall and never rise, and four type-level
 * statics would have grown it — so this is `new Texture(work)` and four
 * instance methods, which is the `Light`/`Quantity` shape anyway.
 *
 * ⚠ **Bands, never a number.** `look` says *"close-grained, with the
 * sinew of a joint that carried the animal"*, not `work: 0.8`. The number
 * is the engine's; the words are the player's.
 */

/** The three bands a cut's texture reads as. */
export const TEXTURE_BANDS = ['tender', 'middling', 'tough'] as const;
export type TextureBand = (typeof TEXTURE_BANDS)[number];

/** What a method does to a cut: the two ends of the cooking axis. */
export const COOKING_METHODS = ['long-moist', 'fast-dry'] as const;
export type CookingMethod = (typeof COOKING_METHODS)[number];

export class Texture {
  /**
   * @param work How hard the muscle worked in life, `0..1` — clamped on
   *   the way in, because a `Texture` is a READING of a number somebody
   *   else validated (`MuscleMixin.setWork` throws on a bad one) and a
   *   reading should not throw twice.
   */
  public constructor(private readonly work: number) {
    this.work = Math.min(1, Math.max(0, Number.isFinite(work) ? work : 0));
  }

  /**
   * The band this work reads as.
   *
   * ⚠ The cuts either side of a boundary must be DISTINGUISHABLE in
   * prose, which is the half a compiler cannot check. Against the shipped
   * quadruped ladder: `tenderloin .05` and `loin .25` tender · `rib .35`
   * and `belly .50` middling · `leg .60`, `shoulder .80`, `neck .85`,
   * `shank .95` tough. ⭐ Which puts the ox's yoke-worn shoulder in the
   * tough band and its tenderloin in the tender one, off prose authored
   * years before this law was.
   */
  public band(): TextureBand {
    if (this.work < 0.3) return 'tender';
    if (this.work < 0.55) return 'middling';
    return 'tough';
  }

  /** The method this is BEST cooked by, or `null` when it forgives either. */
  public wants(): CookingMethod | null {
    const band = this.band();
    if (band === 'tough') return 'long-moist';
    if (band === 'tender') return 'fast-dry';
    return null;
  }

  /**
   * How well a method suits this cut, `-1..+1` — what the cooking law
   * multiplies an outcome by.
   *
   * ⭐ Asymmetric on purpose, because the mistakes are not symmetric: a
   * tough cut cooked fast is **inedible** (all that collagen, none of it
   * dissolved), while a tender cut braised for hours is merely **wasted**
   * (it still feeds you; you have only destroyed the best thing on the
   * carcass). A cook should learn the worse lesson first.
   */
  public fit(method: CookingMethod): number {
    const band = this.band();
    if (band === 'middling') return 0;
    if (band === 'tough') return method === 'long-moist' ? 1 : -1;
    return method === 'fast-dry' ? 1 : -0.5;
  }

  /** The sentence `look` appends — the player's half of the law, no number. */
  public describe(): string {
    switch (this.band()) {
      case 'tough':
        return 'It is a working muscle: coarse-grained and threaded with sinew, and it will not be hurried.';
      case 'tender':
        return 'The grain is fine and close, and it gives under a thumb. Nothing asked this muscle to do much.';
      default:
        return 'Firm, with a little sinew running through it — it will take whatever you do to it without complaint.';
    }
  }
}
