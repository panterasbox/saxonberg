/**
 * RecoverController — `recover`: take the boat you are sitting in out of
 * the water (river D30) — onto the deck of a ship lying alongside, or up
 * onto the bank it is beached against.
 *
 * Where it can come out is the water's business, asked of the river's
 * warren and the sea's (the water mod, a declared dependency).
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import type ReachWarren from '@saxonberg/content-water/src/idea/ReachWarren';
import type SeaWarren from '@saxonberg/content-water/src/idea/SeaWarren';
import Boat from '../../../thing/Boat';

/** The river's warren and the sea's (the water mod's). */
const WATERS = ['/system/water/idea/SeaWarren', '/system/water/idea/ReachWarren'];

export default class RecoverController extends CommandController<CommandModel> {
  async execute(_model: CommandModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const boat = MixinApi.isContainable(giver) ? giver.getContainer() : null;
    if (!(boat instanceof Boat)) {
      return this.decline(context, 'You are not sitting in a boat.', 'not-in-boat');
    }
    const from = boat.getContainer();
    if (from === null || !MixinApi.isWaterPlace(from)) {
      return this.decline(context, 'She is out of the water already.', 'not-afloat');
    }
    for (const path of WATERS) {
      const water = await StuffApi.singleton<ReachWarren | SeaWarren>(path).catch(() => null);
      if (!water) continue;
      const onto = await water.recoverPlaceFor(from);
      if (onto === null) continue;
      ContainmentApi.move(boat, onto);
      MessageApi.scene(giver)
        .topic('act.move')
        .toSelf(Mml.compose`${Mml.thing(boat)} comes up out of the water and you with it.`)
        .send();
      return;
    }
    return this.decline(context, 'There is nowhere beside here to take her out onto.', 'nowhere');
  }

  private decline(context: CommandContext, text: string, reason: string): void {
    MessageApi.scene(context.commandGiver).topic('shell.result').toSelf(Mml.fromMarkup(text)).send();
    context.note({ kind: 'controller-rejected', reason, detail: text });
  }
}
