/**
 * ElementTreatmentControllerBase — the shared shape of `cool`, `warm` and
 * `rinse` (controller-liquidity W8): bringing what the world relieves —
 * water, a fire — to a body by hand. Not referenced by any YAML — a base
 * class only.
 *
 * ⭐ The three verbs were three copies of one controller that each held
 * the body's rules (which wounds an element relieves, how well, which
 * afflictions it brings down) and their own read of the water, which had
 * drifted (C54: `cool` never looked at a shore and never settled). The
 * rules are the body's now (`Vitals.treatmentPlanFor` with an element
 * token) and the water is the source's (`WaterDrawable`); what is left
 * here is the patient (yourself, by default), the refusal pair, and the
 * engage — the parts that are about how the verb talks.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult, MqlManyResult } from '../../../../api/mql';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { ElementTreatment } from '../../../../lib/vitals/Vitals';
import type { WaterDrawRefusal } from '../../../../lib/bulk/WaterDrawable';

type Composed = ReturnType<typeof Mml.compose>;

/** The topic `treat` and `wash` speak — a deed done to a body. */
const TOPIC = 'act.deed';

/** Every element verb names its patient (optional: yourself). */
export interface ElementTreatmentModel extends CommandModel {
  patient?: MqlOneResult;
}

/** What a done treatment says, to the treater and the room. */
export interface ElementDoneWords {
  self: Composed;
  peers: Composed;
}

export abstract class ElementTreatmentControllerBase<
  M extends ElementTreatmentModel = ElementTreatmentModel,
> extends CommandController<M> {
  /**
   * The body the verb names, or the giver's own; `null` (refused, in the
   * verb's words) when what was named is not a body.
   */
  protected patientOf(model: M, context: CommandContext, noBody: string): { target: Stuff; self: boolean } | null {
    const named = model.patient?.stuff as Stuff | undefined;
    const target: Stuff = named ?? (context.commandGiver as unknown as Stuff);
    if (!MixinApi.isVitals(target)) {
      this.fail(context, noBody, 'no-body');
      return null;
    }
    return { target, self: named === undefined };
  }

  /**
   * ⭐ The body decides what the element would help and does it, now;
   * `nothing` is the refusal when it has nothing that wants it.
   */
  protected async treatWith(
    context: CommandContext,
    target: Stuff,
    element: ElementTreatment,
    nothing: string,
    done: ElementDoneWords,
  ): Promise<void> {
    if (!MixinApi.isVitals(target)) return;
    const plan = target.treatmentPlanFor({ by: context.commandGiver as unknown as Stuff, element });
    if (!plan.ok) return this.fail(context, nothing, plan.reason);
    await this.engagePlan(context, plan, {
      beginSelf: () => Mml.compose``,
      onRefused: () => Mml.compose``,
      onDone: () => done,
    });
  }

  /**
   * The first of the bound sources that gives water — a NARROWING over
   * what the binder handed back (the view's default names every water
   * source in reach); each answers for itself. `frozen` only when nothing
   * else did.
   */
  protected static async firstWater(
    bound: MqlManyResult | undefined,
    actor: Stuff,
  ): Promise<'found' | WaterDrawRefusal['reason']> {
    let why: WaterDrawRefusal['reason'] = 'no-water';
    for (const c of bound?.stuff ?? []) {
      if (!MixinApi.isWaterDrawable(c)) continue;
      const drawn = await c.drawWaterFor(actor);
      if (drawn.ok) return 'found';
      if (drawn.reason === 'frozen') why = 'frozen';
    }
    return why;
  }

  /** Say no, and record why. */
  protected fail(context: CommandContext, line: string, reason: string): void {
    MessageApi.scene(context.commandGiver)
      .topic(TOPIC)
      .toSelf(Mml.fromMarkup(Mml.escape(line)))
      .send();
    context.note({ kind: 'controller-rejected', reason, detail: line });
  }
}
