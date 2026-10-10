/**
 * LaunchController — `launch`: put the boat you are sitting in over the
 * side (maritime D12).
 *
 * Afforded from inside a `Boat` on a deck. The boat leaves every
 * container (the legal final-detach edge) and takes the ship's position
 * as its own, so you are now wherever the boat is — on the water, not in
 * it, and no longer aboard the ship. `course` and `anchor` work from the
 * boat exactly as from a helm.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { ExpanseApi } from '@saxonberg/server/mud/api/expanse';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { PersistableApi } from '@saxonberg/server/mud/api/persistable';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import Boat from '../../../thing/Boat';

export default class LaunchController extends CommandController<CommandModel> {
  async execute(_model: CommandModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const boat = MixinApi.isContainable(giver) ? giver.getContainer() : null;
    if (!(boat instanceof Boat)) {
      return this.decline(context, 'You are not sitting in a boat.', 'not-in-boat');
    }
    const deck = boat.getContainer();
    if (deck === null) {
      return this.decline(context, 'You are already on the water.', 'already-launched');
    }
    const root = MixinApi.isContainable(deck) ? deck.getRootContainer() ?? deck : deck;
    const ship = await ExpanseApi.craftAt(root.getTemplatePath() ?? '');
    const at = ship?.getExpansePosition() ?? null;
    if (!ship || !at || !ship.getExpanse()) {
      return this.decline(context, 'There is no open water under the side to put her into.', 'no-water');
    }
    const expanse = await ExpanseApi.expanse(ship.getExpanse()!);
    if (!expanse) return this.decline(context, 'There is no open water here.', 'no-water');

    ContainmentApi.move(boat, null);
    boat.setExpanse(ship.getExpanse());
    boat.placeAt(at, WorldClockApi.getNow().rawValue());
    await expanse.bands();
    expanse.register(boat);
    void PersistableApi.capture(boat).catch((err) => console.warn('launch: capture failed:', err));

    const shipName = MixinApi.isNamed(ship) ? ship.getName() : 'the ship';
    MessageApi.scene(giver)
      .topic('act.move')
      .toSelf(Mml.compose`You put ${Mml.thing(boat)} over the side and push off from ${shipName}. The water is close enough to touch.`)
      .send();
  }

  private decline(context: CommandContext, text: string, reason: string): void {
    MessageApi.scene(context.commandGiver).topic('shell.result').toSelf(Mml.fromMarkup(text)).send();
    context.note({ kind: 'controller-rejected', reason, detail: text });
  }
}
