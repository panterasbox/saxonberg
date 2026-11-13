/**
 * Quenchable — ⭐⭐ **the tub answers what the piece is**, and there are two
 * things a quench can be.
 *
 *  - **A worked build** is FINISHED: its accumulated buffer (and latched
 *    heat) is handed to `CraftingApi.mintFromBuild`, which reverse-matches
 *    it to a recipe and mints the formed, stamped good — consuming the
 *    workpiece. An off-spec build still yields the generic worked lump.
 *  - **An un-worked hot piece** is HEAT-TREATED, which is what quenching
 *    actually is. Nothing is made; the metal is changed, and how depends
 *    entirely on its carbon ({@link IronCarbon.quenchResponse}): wrought
 *    iron is unchanged (the honest nothing — quenching is not a ritual),
 *    steel hardens, cast iron CRACKS into two halves of itself.
 *
 * A cold, un-worked piece has nothing to say to the tub.
 *
 * ⚠ `temper` is recorded and reported (`analyze chemistry`) with no
 * mechanical consumer yet, and the next `heat` anneals it back — heating past
 * the critical temperature is what annealing IS, which is why a smith
 * quenches LAST.
 *
 * A protocol mixin (controller-liquidity Appendix A): `QuenchController`
 * words the plan; which of the two acts this is was the controller's
 * `if (isBuildEmpty)` until the piece was asked.
 */

import type { MixinConstructor } from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { ActPlan, ActRefusal } from '@saxonberg/server/mud/lib/craft/ActPlan';
import type { Builds } from '@saxonberg/server/mud/lib/craft/ManualBuild';
import type { Alloyed } from '@saxonberg/server/mud/lib/material/Alloyed';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { CraftingApi } from '@saxonberg/server/mud/api/crafting';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { ExecutionContextApi } from '@saxonberg/server/mud/api/execution-context';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import IronCarbon from './IronCarbon';

/** The marker `requires: QuenchableMixin` reads. */
export const QUENCHABLE_MIXIN = 'QuenchableMixin';

/** Real milliseconds of plunging a piece and holding it — before the anvil paces it. */
const QUENCH_MS = 2500;
/** Metabolic watts of the quench. */
const QUENCH_W = 600;

/** ⭐ Every reason a quench is refused — before it starts, or as it lands. */
export type QuenchRefusal =
  /** Cold and never worked: there is nothing to quench. */
  | ActRefusal<'empty-build'>
  /** The mint found nothing that holds its shape. */
  | ActRefusal<'mint-failed'>;

/** Which of the two acts the quench is — the begin words' one fact. */
export interface QuenchBegin {
  manner: 'finish' | 'treat';
}

/** What came out of the tub. */
export type QuenchDone =
  | {
      kind: 'finished';
      output: Stuff;
      recipeId: string;
      /** The recipe's name when this making taught it; `null` otherwise. */
      learnedName: string | null;
    }
  | { kind: 'unchanged' }
  | { kind: 'hardened' }
  | { kind: 'cracked' };

/** A quench plan. */
export type QuenchPlan = ActPlan<QuenchBegin, QuenchDone, QuenchRefusal>;

/** A piece you can put in the slack tub. */
export interface Quenchable {
  /** Quench this: the plan (finish or treat), or why not. */
  quenchPlanFor(actor: Stuff): QuenchPlan | QuenchRefusal;
}

type Piece = Stuff & Builds & Alloyed;

export function QuenchableMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class QuenchableMixin extends Base implements Quenchable {
    static _mixinName: string = QUENCHABLE_MIXIN;
    static _mixinRefusal = '{} is not a piece the slack tub takes';
    static _mixinKind = 'protocol' as const;

    public quenchPlanFor(_actor: Stuff): QuenchPlan | QuenchRefusal {
      const self = this as unknown as Piece;
      if (!self.isBuildEmpty()) {
        // ⚠ The maker is read NOW, inside the command frame: an engaged
        // completion runs outside it and would lose the acting author.
        const makerPath =
          (ExecutionContextApi.getActingAuthor() as Stuff | null)?.getIdentityPath() ?? '';
        return {
          ok: true,
          durationMs: QUENCH_MS,
          effortW: QUENCH_W,
          facts: { manner: 'finish' },
          onComplete: async () => {
            const outcome = await CraftingApi.mintFromBuild({
              workpiece: self,
              contributions: [...self.getContributions()],
              heatedToK: self.getHeatedToK(),
              makerPath,
            });
            if (!outcome.ok) return { ok: false, reason: 'mint-failed' };
            let learnedName: string | null = null;
            if (outcome.learned === true && outcome.recipeId.length > 0) {
              const view = await CraftingApi.lookupRecipe(outcome.recipeId);
              learnedName = view?.name ?? outcome.recipeId;
            }
            return {
              ok: true,
              facts: { kind: 'finished', output: outcome.output, recipeId: outcome.recipeId, learnedName },
            };
          },
        };
      }
      // ⭐ An un-worked piece that has been in the fire is not a mistake —
      // it is the other thing quenching does. Only a COLD one has nothing
      // to say.
      if (self.getHeatedToK() <= 0) return { ok: false, reason: 'empty-build' };
      const brittle = MixinApi.isTangible(self) && self.hasMaterialTag('brittle');
      const response = new IronCarbon(self.fractionOf(IronCarbon.CARBON), brittle).quenchResponse();
      return {
        ok: true,
        durationMs: QUENCH_MS,
        effortW: QUENCH_W,
        facts: { manner: 'treat' },
        onComplete: async () => {
          if (response === 'cracked') {
            await this.crack();
            return { ok: true, facts: { kind: 'cracked' } };
          }
          if (response === 'hardened') self.setTemper('hardened');
          return { ok: true, facts: { kind: response } };
        },
      };
    }

    /**
     * ⚠ A thermal shock through brittle metal does what a thermal shock
     * through brittle metal does: the piece is replaced by two halves of it.
     * The mass is conserved — nothing was lost, only broken — and so is the
     * carbon, and both halves are the piece's owner's.
     */
    protected async crack(): Promise<void> {
      const self = this as unknown as Piece;
      const row = self.getTemplatePath() ?? '';
      const wholeKg = MixinApi.isTangible(self) ? self.getMass().rawValue() : 0;
      const where = MixinApi.isContainable(self) ? self.getContainer() : null;
      if (!row || wholeKg <= 0 || !where || !MixinApi.isContainer(where)) return;
      const makeup = self.getMakeup();
      const halfKg = Quantity.of(Number((wholeKg / 2).toFixed(3)), 'kg');
      // Minted before the piece goes: two halves of the owner's casting.
      const halves: Stuff[] = [];
      for (const _ of [0, 1]) {
        halves.push(await StuffApi.clone<Stuff>(row, undefined, { madeFrom: self }));
      }
      StuffApi.destruct(self);
      for (const half of halves) {
        if (MixinApi.isTangible(half)) half.setMass(halfKg);
        if (MixinApi.isComposition(half)) half.setMakeup(makeup);
        if (MixinApi.isContainable(half)) {
          ContainmentApi.move(half, where);
        }
      }
    }
  };
}
