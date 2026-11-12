/**
 * RecoverController — `recover`: take the boat you are sitting in out of
 * the water (river D30) — onto the deck of a ship lying alongside, or up
 * onto the bank it is beached against.
 *
 * ⭐ The boat decides (`Boat.recover`, controller-liquidity W8): where it
 * can come out is the water's own answer (`Launchable`), asked by the boat.
 * This binds the boat you sit in and words the answer.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import Boat, { type RecoverRefusal } from '../../../thing/Boat';

export default class RecoverController extends CommandController<CommandModel> {
  async execute(_model: CommandModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const boat = MixinApi.isContainable(giver) ? giver.getContainer() : null;
    if (!(boat instanceof Boat)) {
      return this.decline(context, 'You are not sitting in a boat.', 'not-in-boat');
    }
    const out = await boat.recover();
    if (!out.ok) return this.decline(context, RecoverController.refusalText(out), out.reason);
    MessageApi.scene(giver)
      .topic('act.move')
      .toSelf(Mml.compose`${Mml.thing(boat)} comes up out of the water and you with it.`)
      .send();
  }

  /** ⭐ Every refusal `recover` can say. */
  protected static refusalText(r: RecoverRefusal): string {
    switch (r.reason) {
      case 'not-afloat':
        return 'She is out of the water already.';
      case 'nowhere':
        return 'There is nowhere beside here to take her out onto.';
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
