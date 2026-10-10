/**
 * RecoverController — `recover`: bring the boat you are sitting in back
 * aboard a ship lying close (maritime D12).
 *
 * Within `expanse.recoverNm` of a craft with a deck, the boat goes back
 * onto that deck and gives up its position — you are aboard the ship
 * again, still sitting in the boat; `out` to climb onto the deck.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { ExpanseApi } from '@saxonberg/server/mud/api/expanse';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { PersistableApi } from '@saxonberg/server/mud/api/persistable';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { AppApi } from '@saxonberg/server/mud/api/app';
import Structure from '@saxonberg/server/mud/platform/idea/Structure';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import Boat from '../../../thing/Boat';

export default class RecoverController extends CommandController<CommandModel> {
  async execute(_model: CommandModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const boat = MixinApi.isContainable(giver) ? giver.getContainer() : null;
    if (!(boat instanceof Boat)) {
      return this.decline(context, 'You are not sitting in a boat.', 'not-in-boat');
    }
    const at = boat.getExpansePosition();
    const path = boat.getExpanse();
    if (boat.getContainer() !== null || at === null || !path) {
      return this.decline(context, 'She is not in the water.', 'not-launched');
    }
    const expanse = await ExpanseApi.expanse(path);
    const within = Number(AppApi.setting('expanse.recoverNm')) || 1;
    let ship: Structure | null = null;
    let best = Infinity;
    for (const c of expanse?.craft() ?? []) {
      if (!(c instanceof Structure) || c.getEntrance() === null) continue;
      const p = c.getExpansePosition();
      const d = p ? p.distanceNm(at) : Infinity;
      if (d <= within && d < best) {
        ship = c;
        best = d;
      }
    }
    if (ship === null) {
      return this.decline(context, 'There is nothing close enough to come alongside.', 'nothing-alongside');
    }
    const deck = await StuffApi.singleton<Stuff>(ship.getEntrance()!);
    if (!MixinApi.isContainer(deck)) {
      return this.decline(context, 'There is no deck to swing her onto.', 'no-deck');
    }
    await boat.anchorHere();
    expanse?.deregister(boat);
    boat.setExpansePosition(null);
    ContainmentApi.move(boat, deck as Stuff & Container);
    void PersistableApi.capture(boat).catch((err) => console.warn('recover: capture failed:', err));
    MessageApi.scene(giver)
      .topic('act.move')
      .toSelf(Mml.compose`You come alongside ${ship.getName()}, and ${Mml.thing(boat)} is swung back aboard with you in it.`)
      .send();
  }

  private decline(context: CommandContext, text: string, reason: string): void {
    MessageApi.scene(context.commandGiver).topic('shell.result').toSelf(Mml.fromMarkup(text)).send();
    context.note({ kind: 'controller-rejected', reason, detail: text });
  }
}
