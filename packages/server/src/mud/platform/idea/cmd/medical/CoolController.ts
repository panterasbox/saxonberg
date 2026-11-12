/**
 * CoolController — ⭐ **cool a burn (or a body running too hot).**
 *
 * A burn wants FLUID, and there are two things you can do with water: DRINK
 * it (which `treat` does, replacing the plasma the burn weeps) or COOL the
 * wound directly, which is this verb. Cooling a burn applies its treatment
 * (`resolve` → the burn reads *cooled*), so it knits at the treated rate
 * instead of the slow natural one. It also relieves a `by: cooling`
 * affliction — a body running too hot (hyperthermia).
 *
 * ⚠ Its own verb, afforded by the `WaterFixture`'s `peers` bucket beside
 * `rinse` — you learn it standing at a basin — for the same reason `rinse`
 * is not a stanza on `wash`: widening an arg would DELETE a check, and a
 * second view claiming `wash` would shadow it silently.
 */

import { ElementTreatmentControllerBase, type ElementTreatmentModel } from './ElementTreatmentControllerBase';
import type { CommandContext } from '../../../../api/command';
import type { MqlManyResult } from '../../../../api/mql';
import { Mml } from '../../../../api/mml';
import type { Stuff } from '../../../../lib/stuff/Stuff';

interface CoolModel extends ElementTreatmentModel {
  water?: MqlManyResult;
}

export default class CoolController extends ElementTreatmentControllerBase<CoolModel> {
  async execute(model: CoolModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const patient = this.patientOf(model, context, 'There is nothing there to cool.');
    if (!patient) return;
    const { target, self } = patient;

    // ⭐ Water in reach first — the refusal a player can act on. The source
    // answers (`WaterDrawable`): a basin, a jug, a shore's water unless it
    // is frozen over (C54: this verb skipped the shore and read unsettled).
    const water = await CoolController.firstWater(model.water, giver as unknown as Stuff);
    if (water === 'frozen') {
      return this.fail(context, 'The water is frozen over; you would need a hole.', 'frozen');
    }
    if (water !== 'found') {
      return this.fail(context, 'There is no water here to cool it with.', 'no-water');
    }

    await this.treatWith(context, target, 'cooling', `${self ? 'You have' : 'They have'} nothing that cooling would help.`, {
      self: self
        ? Mml.compose`You cool it with water. The heat comes out of it, and it settles.`
        : Mml.compose`You cool ${Mml.thing(target)} with water until the heat comes out of it.`,
      peers: self
        ? Mml.compose`${Mml.actor(giver)} cools themselves with water.`
        : Mml.compose`${Mml.actor(giver)} cools ${Mml.thing(target)} with water.`,
    });
  }
}
