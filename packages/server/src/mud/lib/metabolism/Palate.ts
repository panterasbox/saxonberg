/**
 * PalateMixin — the mouth of a person: the tongue, what it likes, and tasting.
 *
 * Liking is one read for all three kinds of bad. Universally gross is the
 * built-in curve (strong bitter and rot repel everyone). Personally gross is
 * your own offset on it (a born sensitivity, what you have grown used to).
 * Badly made is the same curve past its peak (too salty reads badly to nearly
 * everyone, with no quality score on the food). The food stores nothing and the
 * machine never judges the dish: two people can honestly disagree about a soup.
 *
 * What a body was born with is derived from who it is and stored nowhere, the
 * blood-type precedent, so it survives everything. What it has learned
 * (exposure, aversion) is state and is on the spine. {@link Palate.heritage} is
 * the seam for parents, who do not exist yet.
 *
 * ⚠ `liking` stops at a read: nothing imposes on it yet. It is the signed input
 * the mind build will consume.
 */

import { MixinApi } from '../../api/mixin';
import { BulkableApi } from '../../api/bulk';
import { CraftingApi } from '../../api/crafting';
import { PerceptionApi } from '../../api/perception';
import { StuffApi } from '../../api/stuff';
import { Quantity } from '../quantity';
import { Seeded } from '../Seeded';
import { COMPETENCE_BANDS, CompetenceBand, type CompetenceBandName } from '../advancement/CompetenceBand';
import { TASTE_HEDONICS } from '../material/Material';
import type Material from '../material/Material';
import { Freshness } from '../material/Freshness';
import Aroma, { type HedonicCurve } from '../../platform/idea/Aroma';
import { WorldClockApi } from '../../api/worldclock';
import { Scent } from '../perception/Smell';
import { Savor, type Flavor, type Liking, type PalateDetails, type TasteNote } from '../perception/Flavor';
import type { TasteModality } from '../../platform/idea/modalities/TasteModality';
import type { FieldMeta, MixinConstructor } from '../mixin';
import type { CommandContributions } from '../../api/command';
import type { Stuff } from '../stuff/Stuff';

/** One mouthful, in litres, out of what a vessel holds. */
const TASTE_LITRES = 0.01;
/** One bite, off a thing's mass. */
const TASTE_KG = 0.01;
const LITRE: 'L' = 'L';

/** The widest a born sensitivity moves a taste, in steps of its own ladder. */
const BORN_TASTE_SPREAD = 0.5;
/** The widest a born liking moves a word. */
const BORN_LIKING_SPREAD = 0.3;
/** A step on the taste ladder, as a multiple. */
const TASTE_STEP = Math.sqrt(10);
/** Repeated exposure raises liking, up to this. */
const EXPOSURE_RATE = 0.03;
const EXPOSURE_CAP = 0.3;
/** How much starving raises liking. */
const HUNGER_WEIGHT = 0.6;
/** Everyone agrees about a rotten one: the cap on a repellent note past this. */
const REPELLENT_OU = 300;
const REPELLENT_CAP = -0.6;
/** What food poisoning leaves behind. */
const AVERSION_CAP = -0.6;
const MAX_EXPOSURES = 64;
const MAX_AVERSIONS = 32;
const DEFAULT_AROMA_CURVE: HedonicCurve = { peak: 1.5, width: 2, valence: 1 };

/** What came of a taste. A reason, or the facts; the controller words it. */
export type TasteOutcome =
  | { ok: false; reason: 'airway'; line: string }
  | { ok: false; reason: 'nothing-left' }
  | { ok: false; reason: 'closed' }
  | {
      ok: true;
      /** The size of it: a bite off the thing, a sip out of it, or a lick. */
      mouthful: 'bite' | 'sip' | 'lick';
      /** Its presentation, captured before a last bite takes it. */
      foodName: string;
      savor: Savor;
      /** The corrosive leg landed. */
      burned: boolean;
    };

/** A species' reach over its people's palates (`Species.palate`). */
export interface PalateProfile {
  /** Multiplies how far apart its people are born. */
  spread?: number;
  /** A word's curve for this kind of body. */
  curves?: Record<string, HedonicCurve>;
}

export interface Palate {
  /** What this mouth makes of a flavor. */
  tongue(flavor: Flavor, opts?: { foodKey?: string; food?: Stuff }): Savor;
  /** How this person takes to these notes, right now. */
  liking(
    notes: readonly TasteNote[],
    opts?: { foodKey?: string },
  ): Liking;
  /** Put something to the tongue: a real mouthful, with whatever it holds. */
  taste(food: Stuff): Promise<TasteOutcome>;
  /** Eating or tasting it taught this body something. */
  recordExposure(notes: readonly TasteNote[]): void;
  /** It made them ill: reads once symptoms arrive. */
  recordAversion(foodKey: string, symptomsAt: number): void;
  /** What this body has grown used to, per word. */
  getExposures(): Readonly<Record<string, { times: number; lastAt: number }>>;
  /** What it will not forgive, per food: when symptoms arrived. */
  getAversions(): Readonly<Record<string, number>>;
  /** Where a body's born offsets center. No parents exist yet. */
  heritage(): { offsets: Record<string, number> } | null;
  /** How far apart this body's kind is born, as a multiple. */
  palateSpread(): number;
  /** Hunger is doing real work on what this person reads as good. */
  hungerRaises(): boolean;
}

export function PalateMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class PalateMixin extends Base implements Palate {
    static _mixinName = 'PalateMixin';

    static commandContributions: CommandContributions = {
      self: ['platform/cmd/perception/taste.yaml'],
    };

    static fieldMeta: FieldMeta = {
      exposures: { persistent: true, runtimeState: true },
      aversions: { persistent: true, runtimeState: true },
    };

    public exposures: Record<string, { times: number; lastAt: number }> = {};
    public aversions: Record<string, number> = {};

    public heritage(): { offsets: Record<string, number> } | null {
      return null;
    }

    public palateSpread(): number {
      return this.speciesPalate()?.spread ?? 1;
    }

    public hungerRaises(): boolean {
      return HUNGER_WEIGHT * (1 - this.satiationShare()) ** 2 >= 0.2;
    }

    public getExposures(): Readonly<Record<string, { times: number; lastAt: number }>> {
      return this.exposures;
    }

    public getAversions(): Readonly<Record<string, number>> {
      return this.aversions;
    }

    public recordExposure(notes: readonly TasteNote[]): void {
      const now = WorldClockApi.getNow().rawValue();
      const next = { ...this.exposures };
      for (const note of notes) {
        next[note.type] = { times: (next[note.type]?.times ?? 0) + 1, lastAt: now };
      }
      const keys = Object.keys(next);
      if (keys.length > MAX_EXPOSURES) {
        keys
          .sort((a, b) => next[a]!.lastAt - next[b]!.lastAt)
          .slice(0, keys.length - MAX_EXPOSURES)
          .forEach((k) => delete next[k]);
      }
      this.exposures = next;
    }

    public recordAversion(foodKey: string, symptomsAt: number): void {
      const next = { ...this.aversions, [foodKey]: symptomsAt };
      const keys = Object.keys(next);
      if (keys.length > MAX_AVERSIONS) {
        keys
          .sort((a, b) => next[a]! - next[b]!)
          .slice(0, keys.length - MAX_AVERSIONS)
          .forEach((k) => delete next[k]);
      }
      this.aversions = next;
    }

    public tongue(flavor: Flavor, opts: { foodKey?: string; food?: Stuff } = {}): Savor {
      const self = this as unknown as Stuff;
      const tastes: TasteNote[] = [];
      for (const note of flavor.tastes) {
        const ou = note.ou * TASTE_STEP ** this.bornDraw(`taste:${note.type}`, BORN_TASTE_SPREAD);
        if (ou >= 1) tastes.push({ type: note.type, ou });
      }
      const scent = MixinApi.isOlfactory(self)
        ? self.nose(flavor.aromas, { close: true })
        : null;
      // The aromas count toward liking at the strength this nose read them.
      const notes: TasteNote[] = [
        ...tastes,
        ...(scent?.notes ?? []).map((n) => ({ type: n.leaf, ou: n.ou })),
      ];
      const liking = this.liking(notes, opts);
      return new Savor(
        tastes,
        scent ?? Scent.EMPTY,
        liking,
        opts.food ? this.detailsOf(opts.food) : undefined,
      );
    }

    public liking(notes: readonly TasteNote[], opts: { foodKey?: string } = {}): Liking {
      let weighted = 0;
      let weight = 0;
      let cap = 1;
      for (const note of notes) {
        const strength = Math.log10(Math.max(1, note.ou));
        const curve = this.curveFor(note.type);
        const w = strength + 0.1;
        const own =
          hedonic(curve, strength) +
          this.bornDraw(`liking:${note.type}`, BORN_LIKING_SPREAD) +
          Math.min(EXPOSURE_CAP, EXPOSURE_RATE * (this.exposures[note.type]?.times ?? 0));
        weighted += w * own;
        weight += w;
        if (curve.valence < 0 && note.ou >= REPELLENT_OU) cap = Math.min(cap, REPELLENT_CAP);
      }
      let score = weight > 0 ? weighted / weight : 0;
      score += HUNGER_WEIGHT * (1 - this.satiationShare()) ** 2;
      const key = opts.foodKey;
      const aversionAt = key ? this.aversions[key] : undefined;
      if (aversionAt !== undefined && aversionAt <= WorldClockApi.getNow().rawValue()) {
        cap = Math.min(cap, AVERSION_CAP);
      }
      score = Math.max(-1, Math.min(cap, score));
      return { score, word: likingWord(score) };
    }

    public async taste(food: Stuff): Promise<TasteOutcome> {
      const self = this as unknown as Stuff;
      if (!MixinApi.isMetabolic(self)) return { ok: false, reason: 'nothing-left' };
      const gate = self.canIngest();
      if (!gate.ok) return { ok: false, reason: 'airway', line: gate.line };
      // Nothing gets out of a sealed bottle, a tongue's way or a nose's.
      if (MixinApi.isSealable(food) && !food.isOpen()) return { ok: false, reason: 'closed' };
      const modality = PerceptionApi.modalityByName('taste') as TasteModality;
      const foodName = food.getPresentation();
      // A first read after a restart may find a word or an ingredient cold.
      for (const note of modality.flavorOf(food).aromas.notes) Aroma.resolve(note.word);
      await Aroma.settling();

      // ── a sip: whatever a vessel holds ──
      if (MixinApi.isBulkable(food) && food.hasInteriorBulk() && !food.isBulkEmpty('interior')) {
        const slot = BulkableApi.slotFor(food, undefined);
        if (!slot || slot.isEmpty()) return { ok: false, reason: 'nothing-left' };
        const material = slot.getMaterial();
        if (!material) return { ok: false, reason: 'nothing-left' };
        const payload = new Freshness(slot).ingestPayload();
        const foodKey = this.foodKeyOf(payload?.recipeId, material);
        const flavor = modality.flavorOf(food);
        const savor = this.tongue(flavor, { foodKey, food });
        const result = BulkableApi.transfer(slot, null, {
          kind: 'measure',
          litres: TASTE_LITRES,
          mode: 'lenient',
        });
        if (result.applied <= 0) return { ok: false, reason: 'nothing-left' };
        const kg = (result.applied * material.getDensity().rawValue()) / 1000;
        BulkableApi.ingest(self, material, result.applied, payload, kg);
        this.recordExposure(savor.tastes);
        return {
          ok: true,
          mouthful: 'sip',
          foodName,
          savor,
          burned: self.corrosivesIn(material, payload).length > 0,
        };
      }

      if (!MixinApi.isTangible(food)) return { ok: false, reason: 'nothing-left' };
      const material = food.getMaterial();
      if (!material) return { ok: false, reason: 'nothing-left' };
      const payload = MixinApi.isFresh(food) ? food.ingestPayload() : null;
      const foodKey = this.foodKeyOf(payload?.recipeId, material);
      const savor = this.tongue(modality.flavorOf(food), { foodKey, food });

      // ── a bite off edible matter, or a lick of what would do something ──
      const edible = food.isEdible();
      const litres = Quantity.of(TASTE_LITRES, LITRE);
      self.ingest(material, litres, 'solid', payload, TASTE_KG);
      if (edible) await food.takeBite(TASTE_KG);
      this.recordExposure(savor.tastes);
      return {
        ok: true,
        mouthful: edible ? 'bite' : 'lick',
        foodName,
        savor,
        burned: self.corrosivesIn(material, payload).length > 0,
      };
    }

    private foodKeyOf(recipeId: string | undefined, material: Material): string {
      return recipeId ?? material.getTemplatePath() ?? '';
    }

    /** What a trained palate can tell about the making. */
    private detailsOf(food: Stuff): PalateDetails {
      if (!MixinApi.isBulkable(food) || !food.hasInteriorBulk() || food.isBulkEmpty('interior')) {
        return { parts: [], gradeBand: null, maturedDays: 0 };
      }
      const payload = food.getBulkPayload('interior');
      const band = this.bandIn(CraftingApi.blendDiscipline(payload));
      const parts = CompetenceBand.atOrAbove(band, 'competent')
        ? [
            ...new Set(
              (payload?.makeup ?? [])
                .map((p) => StuffApi.findByTemplatePath<Material>(p.materialPath)?.getName())
                .filter((n): n is string => !!n),
            ),
          ]
        : [];
      const proficient = CompetenceBand.atOrAbove(band, 'proficient');
      return {
        parts,
        gradeBand: proficient && MixinApi.isGraded(food) ? food.getGradeBand() : null,
        maturedDays: proficient ? (payload?.maturedDays ?? 0) : 0,
      };
    }

    private bandIn(discipline: string): CompetenceBandName {
      const self = this as unknown as Stuff;
      if (!discipline || !MixinApi.isAdvancing(self)) return COMPETENCE_BANDS[0]!;
      return (
        self.competenceDigestCached()?.find((d) => d.discipline === discipline)?.band ??
        COMPETENCE_BANDS[0]!
      );
    }

    private speciesPalate(): PalateProfile | null {
      const self = this as unknown as Stuff;
      return MixinApi.isOrganism(self) ? (self.getSpecies()?.getPalate() ?? null) : null;
    }

    /** The species' curve for a word, else the taste's, else the aroma row's. */
    private curveFor(word: string): HedonicCurve {
      const species = this.speciesPalate()?.curves?.[word];
      if (species) return species;
      return (
        TASTE_HEDONICS[word] ?? Aroma.resolve(word)?.getLiking() ?? DEFAULT_AROMA_CURVE
      );
    }

    /** A signed draw from who this body is, scaled by its species' spread. */
    private bornDraw(salt: string, width: number): number {
      const self = this as unknown as Stuff;
      const seed = Seeded.ofString(self.getIdentityPath() ?? '');
      const draw = Seeded.unit(seed, Seeded.ofString(salt));
      const center = this.heritage()?.offsets[salt] ?? 0;
      return center + (draw * 2 - 1) * width * this.palateSpread();
    }

    /** How full, 0 to 1; a body with no such reserve reads as full. */
    private satiationShare(): number {
      const self = this as unknown as Stuff;
      if (!MixinApi.isReserved(self)) return 1;
      const reserve = self.getReserve('satiation');
      if (!reserve) return 1;
      const max = reserve.capacity.rawValue();
      return max > 0 ? Math.max(0, Math.min(1, reserve.current.rawValue() / max)) : 1;
    }
  };
}

/**
 * ⭐ A pleasant smell is a hump: liking rises to a peak and falls past it, which
 * is what too salty IS. A repellent one has no peak: it only gets worse.
 */
function hedonic(curve: HedonicCurve, strength: number): number {
  if (curve.valence < 0) {
    return Math.max(-1, -strength / curve.width);
  }
  const off = (strength - curve.peak) / curve.width;
  return Math.max(-1, Math.min(1, curve.valence * (1 - off * off)));
}

function likingWord(score: number): Liking['word'] {
  if (score <= -0.6) return 'revolting';
  if (score < -0.2) return 'unpleasant';
  if (score <= 0.2) return 'indifferent';
  if (score < 0.6) return 'good';
  return 'delicious';
}
