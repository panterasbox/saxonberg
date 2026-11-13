/**
 * DoseController — ⭐ **give a body a dose of a remedy.**
 *
 * `dose [<patient>] with <vial>`: one act (controller-liquidity W7c). The
 * body asks the SUBSTANCE (`Metabolic.dosePlanFor`): a vial whose matter
 * carries an `antidote:<toxin>` tag crashes each matching burden; one
 * tagged `active` (a prescribed anaesthetic, a folk analgesic) is
 * administered as a burden, a controlled one only by a licensed giver or
 * against a matching `Prescription`. What a remedy does is a fact about the
 * substance, not this verb — an author writes a vial of antivenin and it
 * works. The controller words the answer; a refusal NAMES why (the
 * 5-rights error is legible, D14).
 *
 * ⚠ The record's `dose me with vial` ended in a controller error before
 * W7c: `with` is one object and the controller iterated it as a list.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult, MqlManyResult } from '../../../../api/mql';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { DoseFacts, DoseRefusal } from '../../../../lib/metabolism/Metabolic';

type Composed = ReturnType<typeof Mml.compose>;

const TOPIC = 'act.deed';

interface DoseModel extends CommandModel {
  patient?: MqlOneResult;
  with?: MqlOneResult;
  prescription?: MqlManyResult;
}

export default class DoseController extends CommandController<DoseModel> {
  async execute(model: DoseModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const named = model.patient?.stuff ?? null;
    const target: Stuff = named ?? (giver as unknown as Stuff);
    const self = named === null || named === (giver as unknown as Stuff);
    if (!MixinApi.isMetabolic(target)) {
      return this.refuse(context, TOPIC, 'There is nothing there to dose.', 'no-body');
    }
    const remedy = model.with?.stuff ?? null;
    if (remedy === null) {
      return this.refuse(context, TOPIC, DoseController.refusal({ ok: false, reason: 'no-remedy' }, self), 'no-remedy');
    }
    const answer = await target.dosePlanFor(giver as unknown as Stuff, remedy, model.prescription?.stuff ?? []);
    if (!answer.ok) return this.refuse(context, TOPIC, DoseController.refusal(answer, self), answer.reason);
    await this.engagePlan(context, answer, {
      beginSelf: () => Mml.compose``,
      onRefused: (r) => Mml.compose`${DoseController.refusal(r, self)}`,
      onDone: (f) => DoseController.done(giver as unknown as Stuff, target, self, f),
    });
  }

  /** The dose given, in words. */
  protected static done(giver: Stuff, target: Stuff, self: boolean, f: DoseFacts): { self: Composed; peers: Composed } {
    if (f.kind === 'antidote') {
      return self
        ? {
          self: Mml.compose`You take a dose from ${Mml.thing(f.remedy)}. It bites going down, and the poison starts to let go.`,
          peers: Mml.compose`${Mml.actor(giver)} takes a dose from ${Mml.thing(f.remedy)}.`,
        }
        : {
          self: Mml.compose`You give ${Mml.thing(target)} a dose from ${Mml.thing(f.remedy)}.`,
          peers: Mml.compose`${Mml.actor(giver)} doses ${Mml.thing(target)} from ${Mml.thing(f.remedy)}.`,
        };
    }
    return {
      self: self
        ? Mml.compose`You take a dose of ${f.active} from ${Mml.thing(f.remedy)}.`
        : Mml.compose`You administer a dose of ${f.active} to ${Mml.thing(target)}.`,
      peers: Mml.compose`${Mml.actor(giver)} administers a dose from ${Mml.thing(f.remedy)}.`,
    };
  }

  /** Why no dose was given, in words. */
  protected static refusal(r: DoseRefusal, self: boolean): string {
    switch (r.reason) {
      case 'no-remedy':
        return 'You have no remedy to hand — nothing here that names an antidote or an active.';
      case 'empty-vial':
        return 'The vial is empty.';
      case 'nothing-to-counter':
        return `The remedy would counter ${r.facts.counters.join(', ')}, but ${self ? 'you have' : 'they have'} none of it.`;
      case 'wrong-patient':
        return 'That prescription is not for them.';
      case 'not-licensed':
        return `No prescription — and you are not licensed to administer ${r.facts.active}.`;
      default: {
        const unworded: never = r;
        throw new Error(`DoseController: no words for ${String(unworded)}`);
      }
    }
  }
}
