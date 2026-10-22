/**
 * LaunchController — `launch`: put the boat you are sitting in into the
 * water (river D30).
 *
 * A boat is a thing in a water room, so launching it is moving it from
 * where it lies — a bank, a landing, a ship's deck — into the water beside
 * there. From a bank on a river it goes into the water at the bank's edge,
 * held there (a stop); `paddle` pushes off. From a ship's deck it goes into
 * the room alongside her, where she has stopped.
 *
 * Which water, and whether there is any, is the water's business: asked of
 * the river's warren (and the sea's) by shape.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import Boat from '../../../thing/Boat';

/** The waters a boat can be put into, by shape. */
interface LaunchWater {
  launchPlaceFor(from: Stuff): Promise<(Stuff & Container) | null>;
}

/** Where the river's warren and the sea's live. */
const WATERS = ['/system/water/idea/ReachWarren', '/system/water/idea/SeaWarren'];

export default class LaunchController extends CommandController<CommandModel> {
  async execute(_model: CommandModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const boat = MixinApi.isContainable(giver) ? giver.getContainer() : null;
    if (!(boat instanceof Boat)) {
      return this.decline(context, 'You are not sitting in a boat.', 'not-in-boat');
    }
    const from = boat.getContainer() as unknown as Stuff | null;
    if (from === null) return this.decline(context, 'There is nowhere to put her into.', 'no-water');
    if (MixinApi.isWaterPlace(from)) {
      return this.decline(context, 'She is in the water already.', 'already-launched');
    }
    for (const path of WATERS) {
      const water = await StuffApi.singleton<Stuff & Partial<LaunchWater>>(path).catch(() => null);
      if (!water || typeof water.launchPlaceFor !== 'function') continue;
      const into = await water.launchPlaceFor(from);
      if (into === null) continue;
      ContainmentApi.move(boat, into);
      MessageApi.scene(giver)
        .topic('act.move')
        .toSelf(Mml.compose`You run ${Mml.thing(boat)} down into the water and she floats. The water is close enough to touch.`)
        .toPeers(Mml.compose`${Mml.actor(giver)} runs ${Mml.thing(boat)} down into the water.`)
        .send();
      return;
    }
    return this.decline(context, 'There is no open water beside here to put her into.', 'no-water');
  }

  private decline(context: CommandContext, text: string, reason: string): void {
    MessageApi.scene(context.commandGiver).topic('shell.result').toSelf(Mml.fromMarkup(text)).send();
    context.note({ kind: 'controller-rejected', reason, detail: text });
  }
}
