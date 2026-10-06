/**
 * DissolvedAromatics — ⭐⭐ **what matter SMELLS of, as a concentration.**
 *
 * The sibling of {@link DissolvedToxins}, and deliberately not the same
 * field. The arithmetic is identical (both promoted to
 * {@link Concentration}), but the two route to different places and that
 * is the whole distinction:
 *
 *   - a **dissolved toxin** routes to a body's burden at the ingest —
 *     `routeIntake` adds `amount × litres` and a condition follows;
 *   - a **dissolved aromatic** routes to a **nose**. Nothing is ever
 *     harmed by it. It is read, banded by the reader's own competence,
 *     and rendered in words.
 *
 * Generalising `dissolvedToxins` into one typed `dissolved[]` was the
 * alternative, and it was declined: it renames a shipped field at its
 * second consumer and changes `routeIntake`'s contract to buy nothing,
 * because the arithmetic — the only part that was actually duplicated —
 * is shared already.
 *
 * ## ⭐ What this is FOR
 *
 * Peat. A kiln fired with turf puts phenols into the green malt; the
 * phenols survive the mash and the ferment, and they come over the still
 * **late** (`FractionSpec.aromaticCarry` — they are high-boiling, which
 * is the real reason a heavily peated house cuts lower than a clean one).
 * They then blend by volume when whiskies are vatted, exactly as the
 * trade's own ppm figures do. ⭐ So a choice at the *malting* rung changes
 * where the right answer lies at the *cut* — which is the thing the
 * predecessor build could not say about any of its six rungs.
 *
 * A cask does the same thing from the other direction: `MaturingMixin`'s
 * `imparts` adds oak, vanilla and char over the course of a batch.
 *
 * ## ⚠ Why the vocabulary is CLOSED and in the kernel
 *
 * `AROMAS` below is a fixed list with a detection threshold per word, on
 * the {@link BASIC_TASTES} precedent — *"the physiology's own closed
 * list."* An odour threshold is physiology, not content: it is a fact
 * about a human nose, measured in a lab, and it does not vary by realm.
 * A row authors a **word and a number** (`{type: smoke, amount: 30}`) and
 * the sentence a player reads is derived — nothing authors prose here,
 * and no digit ever renders.
 *
 * ⚠⚠⚠ **PROVISIONAL. Do not copy this pattern to another sense, and do
 * not add a twelfth word without reading this.**
 *
 * `lint:closed-vocabularies` counts this list, deliberately, and the
 * ceiling is what will stop the next addition. The reason:
 *
 * ⛔ **The `BASIC_TASTES` analogy that justified it does not hold.** Taste
 * can be a closed kernel list because taste physiology genuinely IS
 * closed — five receptor classes, which is territory rather than a
 * modelling choice. Smell is not: ~400 olfactory receptor types, no
 * agreed basis set, and "primary odors" is a research programme that
 * failed. So this list is closed for **implementation convenience** — it
 * needed somewhere to hang thresholds — and was licensed by a precedent
 * whose closure comes from biology. A true-sounding precedent used to
 * permit something it does not reach.
 *
 * ⭐⭐ **The replacement is already designed and shipped elsewhere:
 * `instrumentation.md`'s reading channels.** One ROW per aroma carrying
 * its own threshold, at `<root>/idea/reading/<aroma>.yaml`, warmed by
 * `ReadingCatalogue` by template-path infix — *"no kernel list, no stanza
 * in a platform view, no boot-sequencer line"*, 31 channels across the
 * platform and seven packs today. Then a perfumer's pack brings `tar` and
 * nothing in the kernel moves. `Placement` made this exact journey from
 * enum to row.
 *
 * ⭐ And lens 5 says the same thing from the other end: a gas
 * chromatograph in the industrial epoch should read **this same
 * concentration field** and hand back a NUMBER where a nose hands back a
 * word. So the field survives the epoch and the word list is only the
 * medieval reading of it — which is precisely the instrument-ceiling
 * ladder instrumentation already models. ⚠ The concentration is right;
 * the vocabulary being kernel is the part that is wrong.
 *
 * ⚠ The other half that is missing: `Material` carries `tastes` and
 * **nothing for smell**, so what a SUBSTANCE smells of cannot be
 * authored at all — only what a process `imparts`. That is why peat
 * smelling of smoke is declared by a recipe rather than derivable from
 * the material, and it is the half that would make lens 1 pass.
 *
 * ⚠ **No `blend` / `isClean` forwarders here, unlike {@link
 * DissolvedToxins}.** Callers use {@link Concentration} directly. The
 * symmetry would read better, but `lint:lib-statics` is a ratchet and a
 * static that exists only to forward is exactly what it is counting
 * down — the toxin class's pair is grandfathered census, not a pattern
 * to copy.
 */

import { Concentration, type Concentrate } from "../bulk/Concentration";
import {
  COMPETENCE_BANDS,
  type CompetenceBandName,
} from "../advancement/CompetenceBand";
import type { BulkPayload, BulkSlot } from "../bulk/Bulkable";

/**
 * An aroma compound's concentration in this matter, mg per litre. `type`
 * must be one of {@link AROMAS}; `Recipe.fromData` and the row
 * validators refuse anything else, because a typo in an aroma word would
 * otherwise fail closed and silent — the matter would simply never smell
 * of anything.
 */
export interface AromaTag extends Concentrate {
  /** The compound. One of {@link AROMAS}. */
  type: string;
  /** mg per litre of this matter. */
  amount: number;
}

/**
 * ⭐ The closed vocabulary, with the detection threshold (mg/L) a human
 * nose actually has for each. Figures are order-of-magnitude values from
 * the flavour-chemistry literature for the named compound class — the
 * point is the *ratios* between them, which is what makes one aroma
 * dominate another in a reading.
 *
 * Where a word stands for a family (`smoke` is guaiacol and the cresols;
 * `oak` is the lactones), the threshold is the family's most potent
 * member, which is what a nose in fact detects first.
 */
export const AROMAS: readonly { readonly type: string; readonly thresholdMgL: number }[] = [
  // Guaiacol / 4-methylguaiacol — the phenols a peat kiln leaves. Very
  // low threshold, which is why a few ppm reads as "heavily peated".
  { type: "smoke", thresholdMgL: 0.02 },
  // Vanillin, from the oak's lignin. Toasting and charring make more.
  { type: "vanilla", thresholdMgL: 0.1 },
  // The oak lactones — "whisky lactone" — the plain wood note.
  { type: "oak", thresholdMgL: 0.07 },
  // Furfural and the pyrolysis products of a charred stave.
  { type: "char", thresholdMgL: 0.3 },
  // The fruity esters a ferment throws; ethyl hexanoate and company.
  { type: "fruit", thresholdMgL: 0.05 },
  // The higher-alcohol florals — phenylethanol and its relatives.
  { type: "floral", thresholdMgL: 0.5 },
  // The cereal note of a grain spirit: the aldehydes off the mash.
  { type: "grain", thresholdMgL: 1.0 },
  // Phenylacetic acid and the honeyed esters of a long maturation.
  { type: "honey", thresholdMgL: 0.2 },
  // Eugenol — clove and spice, from the wood and from a rye-heavy mash.
  { type: "spice", thresholdMgL: 0.03 },
  // ⚠ The fault notes. Ethyl acetate high in the heads — a reading of
  // `solvent` is the nose telling you the cut was taken too early, and
  // it is the one aroma a player should learn to dislike.
  { type: "solvent", thresholdMgL: 5.0 },
  // Dimethyl sulphide and the mercaptans — a dirty ferment or a sulphury
  // low wine. The other fault.
  { type: "sulphur", thresholdMgL: 0.01 },
];

/**
 * The intensity words, by multiple of the detection threshold.
 *
 * WARNING: **The steps are LOGARITHMIC, and the plan's linear
 * 1x / 3x / 10x could not have worked.** Odour detection thresholds are
 * measured in parts per *billion* while the compounds a drink actually
 * carries are measured in parts per *million*, so real concentrations
 * sit three to four orders of magnitude above threshold. Worked against
 * the shipped figures: a firmly peated malt's hearts carry 75 mg/L of
 * phenol against a 0.02 mg/L threshold -- **3,750x**. On a 1/3/10 ladder
 * every whisky in the game reads "strongly of smoke" and the band means
 * nothing; the gauge is pinned before the first row is authored.
 *
 * So the ladder spans the range the product actually uses, and the
 * shipped figures land across four of its five steps:
 *
 *   - the heads at 0.5x carry      ->   750x  ->  clearly
 *   - the hearts at 2.5x carry     -> 3,750x  ->  strongly
 *   - the tails at 6x carry        -> 9,000x  ->  overpoweringly
 *   - a 1:2.5 blend of the hearts  -> 1,250x  ->  clearly
 *   - a lightly peated malt (3ppm) ->   375x  ->  clearly
 *
 * The case that set the top two steps is the one the drive turns on: a
 * peated malt vatted with grain spirit must read **fainter than the malt
 * alone**, because that is what a blender is doing and a reading that
 * could not show it would make blending invisible.
 *
 * Human intensity perception really is compressive (Stevens' law, with
 * an exponent well under 1 for odour), so a log ladder is the honest
 * shape and not a convenience.
 */
const INTENSITIES: readonly { readonly atMultiple: number; readonly word: string }[] = [
  { atMultiple: 8000, word: "overpoweringly" },
  { atMultiple: 2000, word: "strongly" },
  { atMultiple: 300, word: "clearly" },
  { atMultiple: 30, word: "faintly" },
  { atMultiple: 1, word: "barely" },
];

/**
 * @internal
 *
 * ⚠ Not author surface — see {@link Concentration} for the full reasoning
 * and why a raised ceiling was the wrong answer. Callers are `Recipe`'s
 * row validation, `Palatable`'s augmenter and `Fractionating`'s; an author
 * reaches every one of these readings through `smell` / `taste` on a
 * mixin, which is queryable, and authors the figures as `imparts:` on a
 * row.
 */
export class DissolvedAromatics {
  /** A gauge bound to the slot whose matter it measures. */
  constructor(private readonly slot: BulkSlot) {}

  /** Whether a word is in the closed vocabulary. */
  public static isAroma(type: string): boolean {
    for (const a of AROMAS) if (a.type === type) return true;
    return false;
  }

  /** The detection threshold for a word, or `null` for an unknown one. */
  public static thresholdFor(type: string): number | null {
    for (const a of AROMAS) if (a.type === type) return a.thresholdMgL;
    return null;
  }

  /**
   * ⭐⭐ **The reading, banded by the reader's competence** — and the
   * banding is DETAIL, never access. Everyone smells the matter; what
   * differs is how much of it they can name.
   *
   *   - **untrained / novice** — the dominant aroma, by name, with **no
   *     intensity word**. "It smells of smoke." That is honestly all an
   *     untrained nose delivers: you know it is smoky, not how smoky.
   *   - **competent and up** — every aroma over its own threshold, each
   *     with its intensity. "It smells strongly of smoke, clearly of oak
   *     and faintly of vanilla."
   *
   * An aroma **below** its detection threshold is not reported to anyone,
   * at any band — a nose does not detect sub-threshold compounds and
   * competence does not change the physics. `null` when there is nothing
   * over threshold at all.
   *
   * ⚠ No digit ever appears in the output. The amounts are mg/L; the
   * reading is words.
   */
  public static render(
    tags: readonly AromaTag[] | undefined,
    band: CompetenceBandName,
  ): string | null {
    const detected: { type: string; multiple: number }[] = [];
    for (const tag of tags ?? []) {
      if (!(tag.amount > 0)) continue;
      const threshold = DissolvedAromatics.thresholdFor(tag.type);
      if (threshold === null || !(threshold > 0)) continue;
      const multiple = tag.amount / threshold;
      if (multiple < 1) continue;
      detected.push({ type: tag.type, multiple });
    }
    if (detected.length === 0) return null;
    // Strongest first — the dominant aroma is what a nose leads with.
    detected.sort((a, b) => b.multiple - a.multiple);

    const rank = COMPETENCE_BANDS.indexOf(band);
    const competent = COMPETENCE_BANDS.indexOf("competent");
    if (rank < competent) {
      const first = detected[0];
      if (!first) return null;
      return `It smells of ${first.type}.`;
    }

    const phrases = detected.map((d) => {
      let word = "faintly";
      for (const step of INTENSITIES) {
        if (d.multiple >= step.atMultiple) {
          word = step.word;
          break;
        }
      }
      return `${word} of ${d.type}`;
    });
    return `It smells ${joinPhrases(phrases)}.`;
  }

  /** This slot's aroma concentrations. `[]` when there are none. */
  tags(): AromaTag[] {
    const payload = this.slot.getPayload();
    if (!payload) return [];
    return (payload.dissolvedAromatics ?? []).map((t) => ({ ...t }));
  }

  /** This slot's raw concentrations — the blend's own read. */
  raw(): readonly AromaTag[] {
    return this.slot.getPayload()?.dissolvedAromatics ?? [];
  }

  /**
   * Stamp the set outright. An empty set removes the field rather than
   * storing `[]`, so matter nothing flavoured stays byte-identical to a
   * payload from before this existed.
   */
  stamp(tags: readonly AromaTag[]): void {
    if (this.slot.getMaterial() === null) return;
    const payload: BulkPayload = this.slot.getPayload() ?? {};
    if (Concentration.isClean(tags)) {
      if (payload.dissolvedAromatics === undefined) return;
      const { dissolvedAromatics: _a, ...rest } = payload;
      this.slot.setPayload(rest);
      return;
    }
    this.slot.setPayload({
      ...payload,
      dissolvedAromatics: tags.map((t) => ({ ...t })),
    });
  }
}

/** `a, b and c` — the ordinary English list. */
function joinPhrases(words: readonly string[]): string {
  if (words.length <= 1) return words[0] ?? "";
  return `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;
}

/**
 * ⭐ Metabolism's third field on the blend payload, declared from the
 * subsystem that owns the word — the `formedToxins` / `dissolvedToxins`
 * move, for the same reason: a `BulkPayload` cannot compose a mixin, and
 * `lib/bulk` must not learn what an aroma is.
 */
declare module "../bulk/Bulkable" {
  interface BulkPayload {
    /**
     * Aroma compounds **per litre** of this matter, mg/L. Blend by volume
     * on every pour, every recipe output and every grind. Absent on
     * matter nothing flavoured — which is almost everything.
     */
    dissolvedAromatics?: AromaTag[];
  }
}
