/**
 * PilotController — `pilot [<pilot>]`: pay a pilot, and come away knowing
 * what they know of the water (maritime D17).
 *
 * The pilot sells it (`Pilot.sellWaterTo`): the claims are asked before
 * the coin (C27), the fee goes into the pilot's own hands, and the
 * knowledge lands in your map as `told` claims signed with their name.
 * This controller says it.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import Pilot, { type PilotRefusal } from '../../../agent/Pilot';

interface PilotModel extends CommandModel {
  pilot?: MqlOneResult;
}

export default class PilotController extends CommandController<PilotModel> {
  async execute(model: PilotModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    // ⭐ Speaking needs a voice the medium carries (underwater D29 seam 5).
    if (MixinApi.isVocal(giver)) {
      const voice = giver.canVocalize();
      if (!voice.ok) return this.decline(context, voice.line, voice.reason);
    }
    const pilot = model.pilot?.stuff ?? null;
    if (!(pilot instanceof Pilot)) {
      return this.decline(context, 'There is no pilot here to ask.', 'no-pilot');
    }
    const out = await pilot.sellWaterTo(giver);
    if (!out.ok) return this.decline(context, PilotController.refusalText(pilot, out), out.reason);
    MessageApi.scene(giver)
      .topic('speech.vocal')
      .toSelf(
        out.facts.told > 0
          ? Mml.compose`${Mml.actor(pilot)} takes your coin and tells you the water — where it runs, where it doesn't, and what it does when the wind is against it. You can \`map\` it now.`
          : Mml.compose`${Mml.actor(pilot)} shrugs: there is nothing to tell you about this water that you don't know.`,
      )
      .toPeers(Mml.compose`${Mml.actor(giver)} pays ${Mml.actor(pilot)} for a word about the water.`)
      .send();
  }

  /** ⭐ Every refusal a pilot can give. */
  protected static refusalText(pilot: Pilot, r: PilotRefusal): string {
    switch (r.reason) {
      case 'nothing-to-tell':
        return `${pilot.getPresentation()} shrugs: there is nothing they could tell you about this water that you would keep.`;
      case 'cannot-pay':
        return `${pilot.getPresentation()} wants ${r.facts.fee} for what they know, and you haven't the coin.`;
      default: {
        const never: never = r;
        return never;
      }
    }
  }

  private decline(context: CommandContext, text: string, reason: string): void {
    MessageApi.scene(context.commandGiver).topic('shell.result').toSelf(Mml.fromMarkup(text)).send();
    context.note({ kind: 'controller-rejected', reason, detail: text });
  }
}
