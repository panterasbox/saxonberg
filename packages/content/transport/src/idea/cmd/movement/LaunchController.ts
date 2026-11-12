/**
 * LaunchController — `launch`: put the boat you are sitting in into the
 * water (river D30).
 *
 * A boat is a thing in a water place, so launching it is moving it from
 * where it lies — a bank, a landing, a ship's deck — into the water beside
 * there. From a bank on a river it goes into the water at the bank's edge,
 * held there (a stop); `paddle` pushes off. From a ship's deck it goes into
 * the room alongside her, where she has stopped.
 *
 * ⭐ The boat decides (`Boat.launch`, controller-liquidity W8): which water
 * is the water's own answer (`Launchable`), asked by the boat. This binds
 * the boat you sit in and words the answer.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import Boat, { type LaunchRefusal } from '../../../thing/Boat';

export default class LaunchController extends CommandController<CommandModel> {
  async execute(_model: CommandModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const boat = MixinApi.isContainable(giver) ? giver.getContainer() : null;
    if (!(boat instanceof Boat)) {
      return this.decline(context, 'You are not sitting in a boat.', 'not-in-boat');
    }
    const out = await boat.launch();
    if (!out.ok) return this.decline(context, LaunchController.refusalText(out), out.reason);
    MessageApi.scene(giver)
      .topic('act.move')
      .toSelf(Mml.compose`You run ${Mml.thing(boat)} down into the water and she floats. The water is close enough to touch.`)
      .toPeers(Mml.compose`${Mml.actor(giver)} runs ${Mml.thing(boat)} down into the water.`)
      .send();
  }

  /** ⭐ Every refusal `launch` can say. */
  protected static refusalText(r: LaunchRefusal): string {
    switch (r.reason) {
      case 'no-water':
        return r.facts.ashore
          ? 'There is no open water beside here to put her into.'
          : 'There is nowhere to put her into.';
      case 'already-launched':
        return 'She is in the water already.';
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
