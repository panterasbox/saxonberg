/**
 * Ash — what a fire leaves when it burns all the way through (potash D1).
 *
 * ⭐ Its STRENGTH is a fact about what burned: the alkali share of the
 * heap, carried as a composition entry of potassium carbonate
 * (`fire.ash.alkaliMaterial`) beside the ash's own mineral. The burner
 * that raked it counted the alkali by each burnt material's
 * `alkaliShare`, so a beech heap is strong and a pine heap weak — and the
 * lye hopper reads `mass × fractionOf(potash)` straight off the heap.
 *
 * A heap of ash is not food: it has no freshness, no cure and no
 * pathogens (it was a `Provision` until this build, which hung all three
 * on it). It is a `Good` with a composition and a grade.
 *
 * `gradedByStrength` (row data): a raked heap's grade IS its strength, so
 * setting the composition re-grades it and the look line reads it in the
 * heap's own words. A refined product of ash — black salts, pearl ash —
 * carries a PURITY in the same entry and its grade from the chain that
 * made it (the lye, the pot, the kiln), so its row leaves the flag off.
 */
import Good from '@saxonberg/server/mud/lib/stuff/Good';
import { CompositionMixin } from '@saxonberg/server/mud/lib/material/Composition';
import type { CompositionEntry } from '@saxonberg/server/mud/lib/material/Material';
import type { Crafted } from '@saxonberg/server/mud/lib/craft/Crafted';
import { CraftedMixin } from '@saxonberg/server/mud/lib/craft/Crafted';
import { Grade } from '@saxonberg/server/mud/lib/craft/Grade';
import type { GradeBand } from '@saxonberg/server/mud/lib/craft/Grade';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { MarkupAugmenter } from '@saxonberg/server/mud/api/mml';

const AshBase = CompositionMixin(CraftedMixin(Good));

/**
 * The strength → band ladder for a raked heap: the share of the ash that
 * is alkali. Pine (~0.08) is poor, oak (~0.15) fair, beech (~0.18) fine,
 * beech brash (~0.23) exceptional. Grain: an author's numbers.
 */
const STRENGTH_BANDS: readonly { below: number; band: GradeBand }[] = [
  { below: 0.1, band: 'poor' },
  { below: 0.165, band: 'fair' },
  { below: 0.22, band: 'fine' },
  { below: 0.3, band: 'exceptional' },
  { below: Infinity, band: 'masterful' },
];

// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging -- deliberate: the interface half only restates surface the runtime class already has (Crafted ⊃ Graded, present via the inner mixin); nothing is declared that isn't there.
interface Ash extends Crafted {}
// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging -- the class half of the same merge
class Ash extends AshBase {
  static fieldMeta: FieldMeta = {
    gradedByStrength: { persistent: true, authorable: true },
  };

  /** Does this heap's grade follow its alkali share? (row data) */
  public gradedByStrength = false;

  static markupAugmenters: MarkupAugmenter[] = [
    (text, host) => {
      if (!(host instanceof Ash)) return text;
      const line = host.strengthLine();
      if (line === '') return text;
      return text && text.length > 0 ? `${text}\n\n${line}` : line;
    },
  ];

  public isGradedByStrength(): boolean {
    return this.gradedByStrength;
  }
  public setGradedByStrength(value: boolean): void {
    this.gradedByStrength = value === true;
  }

  /** The heap's alkali share, `0..1` — the strength the burn left it. */
  public strength(): number {
    // The alkali entry is the heap's ONE composition entry by construction.
    return this.getMakeup()[0]?.fraction ?? 0;
  }

  /** ⭐ Setting the composition re-grades a raked heap by its strength. */
  public setMakeup(entries: readonly CompositionEntry[]): void {
    super.setMakeup(entries);
    if (this.gradedByStrength) this.setGrade(Grade.of(Ash.bandFor(this.strength())));
  }

  /**
   * How the heap looks for its strength — in words, never a number
   * (AC 12): strong ash is pale and bites the tongue; weak ash is grey
   * and gritty with unburnt char.
   */
  public strengthLine(): string {
    if (!this.gradedByStrength || this.getMakeup().length === 0) return '';
    const band = this.getGrade().getBand();
    if (band === 'poor') return 'It is grey and gritty, more cinder than salt.';
    if (band === 'fair') return 'It is an even grey, soft between the fingers.';
    return 'It is pale and fine, and it bites the tongue — strong ash.';
  }

  private static bandFor(strength: number): GradeBand {
    for (const step of STRENGTH_BANDS) if (strength < step.below) return step.band;
    return 'masterful';
  }
}

export default Ash;
