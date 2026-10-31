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
import { PercolatingMixin } from '@saxonberg/server/mud/lib/material/Percolating';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Bulkable } from '@saxonberg/server/mud/lib/bulk/Bulkable';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { AppApi } from '@saxonberg/server/mud/api/app';
import { AppSettingKeys } from '@saxonberg/server/mud/lib/config/AppSettings';
import { LyeStrength } from '@saxonberg/server/mud/lib/cleanliness/LyeStrength';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import type { CompositionEntry } from '@saxonberg/server/mud/lib/material/Material';
import type { Crafted } from '@saxonberg/server/mud/lib/craft/Crafted';
import { CraftedMixin } from '@saxonberg/server/mud/lib/craft/Crafted';
import { Grade } from '@saxonberg/server/mud/lib/craft/Grade';
import type { GradeBand } from '@saxonberg/server/mud/lib/craft/Grade';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { MarkupAugmenter } from '@saxonberg/server/mud/api/mml';

const AshBase = PercolatingMixin(CompositionMixin(CraftedMixin(Good)));

/** What a leached heap leaves behind (potash D6). */
const SPENT_ASH = '/trade/fuel/thing/spent-ash';
/** A leached heap keeps this share of its mass as spent ash. */
const SPENT_SHARE = 0.9;
/** Water takes half a game day to work down through a hopper of ash. */
const LEACH_DAYS = 0.5;

/** A numeric dial, falling back to the literal when unseeded. */
function dial(key: string, fallback: number): number {
  try {
    const v = Number(AppApi.setting(key));
    return Number.isFinite(v) && v > 0 ? v : fallback;
  } catch {
    return fallback;
  }
}

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

  /* ─────────────── ⭐ the leach: water percolates down through the heap ─────────────── */

  /** Half a game day for the water to work down through a hopper of ash. */
  public override percolationDays(): number {
    return LEACH_DAYS;
  }

  /**
   * ⭐ What comes out of the bottom goes into the vessel the heap is IN —
   * the hopper's liquor (potash-on-sugar, cordage W7). The kernel's rule
   * answers a mould's drain or the vessel a solid is set ON; a heap of ash
   * lies in its hopper.
   */
  public override percolatesInto(): (Stuff & Bulkable) | null {
    const holder = MixinApi.isContainable(this) ? (this.getContainer() as Stuff | null) : null;
    if (holder !== null && MixinApi.isBulkable(holder) && holder.hasInteriorBulk()) return holder;
    return super.percolatesInto();
  }

  /**
   * ⭐⭐ The water took `to − from` of the way down: it carries that share
   * of the heap's alkali into the liquor below, less what a HARD water
   * spends on its own lime (river water makes a weaker lye than rain). At
   * the bottom the heap is spent ash where it lies — the owner's still.
   */
  public override onPercolated(fromReach: number, toReach: number): void {
    const into = this.percolatesInto();
    if (into === null) return;
    const litres = into.getBulkAmount('interior').rawValue();
    if (litres > 0) {
      const alkaliPath = (() => {
        try {
          return AppApi.setting(AppSettingKeys.fireAshAlkaliMaterial) || '/stuff/idea/material/mineral/potash';
        } catch {
          return '/stuff/idea/material/mineral/potash';
        }
      })();
      const alkaliKg = this.getMass().rawValue() * this.fractionOf(alkaliPath) * (toReach - fromReach);
      const payload = into.getBulkPayload('interior');
      const kept = Math.max(0, 1 - dial(AppSettingKeys.potashLyeHardnessWastePerDgh, 0.04) * (payload?.hardnessDgh ?? 0));
      const carried = payload?.dissolvedSolidsKgPerL ?? (into.getBulkMaterial('interior')?.getSolidsKgPerL() ?? 0);
      const kgPerL = carried + (alkaliKg / litres) * kept;
      into.setBulkPayload('interior', { ...(payload ?? {}), dissolvedSolidsKgPerL: kgPerL });
      if (MixinApi.isGraded(into)) into.setGrade(Grade.of(new LyeStrength(kgPerL).gradeBand()));
    }
    if (toReach >= 1 && !this._spent) {
      this._spent = true;
      void this.spend(into);
    }
  }

  /** Spending already under way (runtime; never twice). */
  private _spent = false;

  /** The leached heap becomes spent ash where it lies, made from it. */
  private async spend(into: Stuff): Promise<void> {
    const mass = this.getMass().rawValue();
    try {
      const spent = await StuffApi.clone<Stuff & Containable>(SPENT_ASH, undefined, { madeFrom: [this as unknown as Stuff] });
      if (MixinApi.isTangible(spent) && mass > 0) spent.setMass(Quantity.of(mass * SPENT_SHARE, 'kg'));
      if (MixinApi.isContainer(into)) ContainmentApi.move(spent, into as Stuff & Container);
    } catch (err) {
      console.warn(`Ash: no spent ash at '${SPENT_ASH}':`, err);
    }
    await StuffApi.destruct(this as unknown as Stuff);
  }

  private static bandFor(strength: number): GradeBand {
    for (const step of STRENGTH_BANDS) if (strength < step.below) return step.band;
    return 'masterful';
  }
}

export default Ash;
