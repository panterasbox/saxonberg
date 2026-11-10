/**
 * EatingMixin — ⭐ **the act of eating**: a whole edible item (eaten and
 * gone) or a portion out of a served dish (the dish emptied, kept), the
 * first clean utensil used and dirtied, crumbs on the floor and grease on
 * bare fingers (cleanliness D6). The `eat` verb is contributed here and
 * only words the {@link EatOutcome}.
 *
 * ## ⭐ Why it is its own mixin (controllers-are-io D6)
 *
 * It shipped on `MetabolicMixin`, which is DIGESTION — the buffer, the
 * reconcile, the toxins, `vomit`. Eating is how food gets into that
 * buffer, with its own imports (cutlery, the dish, the soiling); it calls
 * `canIngest` and `BulkableApi.ingestSolid` and nothing else of
 * digestion's. Every creature is honestly both, so this is a co-use split
 * on `Creature`, and `EatController` narrows on `MixinApi.isEating`.
 */

import type { MixinConstructor } from "../mixin";
import type { CommandContributions } from "../../api/command";
import type { Stuff } from "../stuff/Stuff";
import type { Liking } from "../perception/Flavor";
import type { TasteModality } from "../../platform/idea/modalities/TasteModality";
import { MixinApi } from "../../api/mixin";
import { StuffApi } from "../../api/stuff";
import { CraftingApi } from "../../api/crafting";
import { BulkableApi } from "../../api/bulk";
import { Freshness } from "../material/Freshness";
import { UTENSIL_KINDS, type UtensilKind } from "../bulk/Cutlery";
import { METABOLIC_DEFAULTS, type Metabolic } from "./Metabolic";

const TASTE_MODALITY_PATH = '/platform/idea/modalities/taste';

/**
 * What `eat` did — or why not. ⭐ The act is the EATER's (review: a
 * controller does input and output, and an alternate `eat` controller — or
 * a brain feeding an animal — must get the same behaviour); the verb only
 * words this.
 */
export type EatOutcome =
  | { ok: false; reason: 'not-edible' | 'too-full' }
  /** The body's own words for why nothing goes in by mouth now. */
  | { ok: false; reason: 'airway'; line: string }
  | {
      ok: true;
      /** Out of a dish (emptied, kept) or a whole item (eaten, gone). */
      fromDish: boolean;
      /** What was eaten, as the sentence wants it (a blend carries its own
       * article; a material's does not). */
      what: string;
      /** The food's presentation, captured before a whole item is gone. */
      foodName: string;
      /** How it went down for this person; absent on a body with no palate. */
      liking?: Liking;
      /** Whether hunger is what got it down. */
      hungerHelped?: boolean;
      /** The clean utensil used and dirtied, or `null` — the fingers. */
      utensil: UtensilKind | null;
    };

/** The public surface: the eater's act. */
export interface Eating {
  /**
   * ⭐ Eat `food`: a whole edible item (all-or-nothing — eaten and gone), or
   * a portion out of a served dish (the dish emptied, not destroyed). The
   * first clean utensil among `utensils` is used and dirtied; eating leaves
   * crumbs on the floor, and grease on bare fingers (cleanliness D6).
   */
  eat(food: Stuff, utensils?: readonly Stuff[]): Promise<EatOutcome>;
}

export function EatingMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class EatingMixin extends Base implements Eating {
    static _mixinName: string = "EatingMixin";

    /** `eat` is the eater's verb (vomit stays with digestion). */
    static commandContributions: CommandContributions = {
      self: ["platform/cmd/bulk/eat.yaml"],
    };

    /**
     * The first clean utensil offered — in kind preference order, the
     * caller's order within a kind — used (dirtied) on the way out.
     * ⭐ Cutlery READS, it never gates: none is a perfectly good way to eat.
     */
    protected claimUtensil(offered: readonly Stuff[]): UtensilKind | null {
      for (const kind of UTENSIL_KINDS) {
        for (const candidate of offered) {
          if (!MixinApi.isCutlery(candidate)) continue;
          if (candidate.getUtensilKind() !== kind) continue;
          if (!MixinApi.isServiceable(candidate)) continue;
          if (!candidate.isClaimable()) continue;
          candidate.markUsed();
          return kind;
        }
      }
      return null;
    }

    /** ⭐ (cleanliness D6) Crumbs on the floor; with the fingers, grease too. */
    protected leaveCrumbs(withCutlery: boolean): void {
      const self = this as unknown as Stuff;
      if (!MixinApi.isHygienic(self)) return;
      self.soilFrom(
        withCutlery
          ? [{ kind: 'crumbs', amount: 0.05, where: 'floor' }]
          : [
              { kind: 'crumbs', amount: 0.05, where: 'floor' },
              { kind: 'grease', amount: 0.03, where: 'hands' },
            ],
      );
    }

    /** How the food reads before it is gone; eating it teaches the palate. */
    private readBeforeEating(food: Stuff): { liking?: Liking; hungerHelped?: boolean } {
      const self = this as unknown as Stuff;
      // Degrades where no modality is loaded (a unit fixture), the file's idiom
      // for the world clock too.
      const modality = StuffApi.findByTemplatePath<TasteModality>(TASTE_MODALITY_PATH);
      if (!modality || !MixinApi.isPalate(self)) return {};
      const flavor = modality.flavorOf(food);
      const payload = MixinApi.isBulkable(food) && food.hasInteriorBulk()
        ? food.getBulkPayload('interior')
        : null;
      const material = MixinApi.isTangible(food) ? food.getMaterial() : null;
      const foodKey = payload?.recipeId ?? material?.getTemplatePath() ?? undefined;
      const savor = self.tongue(flavor, { foodKey });
      self.recordExposure(savor.tastes);
      return { liking: savor.liking, hungerHelped: self.hungerRaises() };
    }

    public async eat(food: Stuff, utensils: readonly Stuff[] = []): Promise<EatOutcome> {
      const self = this as unknown as Stuff;
      // ⭐ Under the water nothing goes in by mouth but the water (D29).
      const ingest = (this as unknown as Metabolic).canIngest();
      if (!ingest.ok) return { ok: false, reason: 'airway', line: ingest.line };
      const portionL = METABOLIC_DEFAULTS.EAT_PORTION_LITRES;
      const wentDown = this.readBeforeEating(food);
      // ⭐ A cooked meal is a bulk blend in a claimed dish: serve from the
      // slot rather than swallowing the crockery, and EMPTY the dish — a
      // bowl you have finished is a bowl to wash.
      if (MixinApi.isBulkable(food) && food.holdsFood()) {
        const slot = BulkableApi.slotFor(food, undefined);
        if (!slot) return { ok: false, reason: 'not-edible' };
        const material = slot.getMaterial();
        const payload = new Freshness(slot).ingestPayload();
        const what = CraftingApi.blendAppearance(payload, material) || 'it';
        const portion = Math.min(portionL, slot.getAmount().rawValue());
        const accepted = BulkableApi.ingestSolid(
          self,
          material,
          portion,
          payload,
          slot.getMassKg(),
        );
        if (accepted < portion - 1e-9) return { ok: false, reason: 'too-full' };
        const utensil = this.claimUtensil(utensils);
        BulkableApi.transfer(slot, null, { kind: 'measure', litres: accepted, mode: 'lenient' });
        this.leaveCrumbs(utensil !== null);
        return { ok: true, fromDish: true, what, foodName: food.getPresentation(), utensil, ...wentDown };
      }
      const material = MixinApi.isTangible(food) ? food.getMaterial() : null;
      if (!material || !MixinApi.hasEdibility(material)) {
        return { ok: false, reason: 'not-edible' };
      }
      // The food synthesizes its own payload (`Fresh.ingestPayload`) — the
      // same answer for every mouth.
      const payload = MixinApi.isFresh(food) ? food.ingestPayload() : null;
      const hostKg = MixinApi.isTangible(food) ? food.getMass().rawValue() : undefined;
      const accepted = BulkableApi.ingestSolid(self, material, portionL, payload, hostKg);
      // A discrete item is all-or-nothing: only a full portion consumes it.
      if (accepted < portionL - 1e-9) return { ok: false, reason: 'too-full' };
      const what = material.getAppearance() || material.getName() || 'it';
      const utensil = this.claimUtensil(utensils);
      this.leaveCrumbs(utensil !== null);
      const foodName = food.getPresentation();
      await StuffApi.destruct(food);
      return { ok: true, fromDish: false, what, foodName, utensil, ...wentDown };
    }
  };
}
