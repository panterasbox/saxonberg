/**
 * MowController — `mow`, and ⭐⭐ **the whole of D7 in one act.**
 *
 * There is no `use` field on a field. What distinguishes *hay* from
 * *grazing* is not a declaration and not a mode — it is **whether the
 * mouth was standing here.** Grazing and mowing are the same draw on the
 * same reserve; the only difference is where the animal was, and that
 * difference is where the nitrogen goes:
 *
 * | | Standing on it | Mouth | Nutrients |
 * |---|---|---|---|
 * | **Hay** | sward | elsewhere | **exported** |
 * | **Graze** | sward | **on the field** | **cycled in place** |
 *
 * So this act does exactly one thing the grazing path does not: it
 * **debits the field's nitrogen** by what the crop carried away. That is
 * why *"the hay meadow is the hungriest field on the farm"* is true here
 * without anybody authoring it, and why **fertility follows the mouths**
 * is a sentence a player derives rather than a rule they are told.
 *
 * ⭐ It cuts to the **residual and no further** (D9), which is not a
 * kindness — it is what a scythe does. You cannot cut grass below the
 * ground, and a sward cut into its crowns is a sward that will not come
 * again. The refusal when there is nothing above the residual is
 * therefore diegetic rather than a rule.
 */

import { FieldWorkController } from './FieldWorkController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import { Mml } from '@saxonberg/server/mud/api/mml';
import type { MowRefusal } from '../../../thing/Field';

type Composed = ReturnType<typeof Mml.compose>;

/** ⭐ The instrument is bound by the view, never hunted for here. */
interface MowModel extends CommandModel {
  tool?: MqlOneResult;
  /** ⭐ Which field — `mow at the far side` (tracts build D38). */
  part?: MqlOneResult;
}

/**
 * ⭐⭐ **The field decides** (controller-liquidity W10): the residual, the
 * pace, the nitrogen exported, the bales and their wetness —
 * `Field.mowPlanFor`. This file binds the scythe and writes the words.
 */
export default class MowController extends FieldWorkController {
  async execute(model: MowModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const reading = await this.fieldOf(giver);
    if (!reading) {
      this.decline(context, Mml.compose`There is no sward here to cut.`, 'no-field');
      return;
    }
    const scythe = this.toolOf(model.tool?.stuff, 'mowing');
    if (!scythe) {
      this.decline(context, Mml.compose`Not by hand. You would want a scythe.`, 'no-tool');
      return;
    }
    const choice = this.fieldChoice(reading.tract, model.part?.stuff ?? null);
    if (!choice.ok) {
      this.decline(context, Mml.fromMarkup(choice.line), choice.reason);
      return;
    }
    const plan = choice.field.mowPlanFor(giver, scythe);
    if (plan === null) return;
    if (!plan.ok) {
      this.decline(context, MowController.refusalWords(plan), plan.reason);
      return;
    }
    await this.engagePlan(context, plan, {
      beginSelf: (f) => Mml.compose`You set the edge of ${Mml.thing(f.scythe)} into the grass and start the first swathe.`,
      beginPeers: () => Mml.compose`${Mml.actor(giver)} starts mowing, working across the field in long even swathes.`,
      onRefused: (r) => MowController.refusalWords(r),
      onDone: (f) => ({
        self: Mml.compose`You cut it down to the residual and leave it lying — ${f.takenKg} kilos of it. ${f.exported ? 'The field is the poorer for what you carried off it.' : ''}`,
        peers: Mml.compose`${Mml.actor(giver)} finishes the last swathe and stands up.`,
      }),
    });
  }

  protected static refusalWords(r: MowRefusal): Composed {
    switch (r.reason) {
      case 'below-residual':
        return Mml.compose`${r.facts.field.swardPhrase()} — there is nothing on it worth a scythe, and cutting into the crowns would finish it.`;
      case 'nothing-cut':
        return Mml.compose`There was less on it than you thought.`;
      default: {
        const never: never = r.reason;
        return Mml.compose`${String(never)}`;
      }
    }
  }
}
