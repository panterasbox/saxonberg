/**
 * CollectController — `collect [tips]`.
 *
 * The on-shift bartender scoops the tip jar into their own holdings — the
 * whole lot, off every ledger. Gated on being the present, active maker
 * (`MixinApi.isMaker`, which is on-shift-aware): only whoever is actually
 * tending the bar can take it. Per-shift attribution falls out — whoever's
 * on shift empties it. See docs/subsystems/employment.md § Tips.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import { ContainmentApi } from '../../../../api/containment';
import { MixinApi } from '../../../../api/mixin';
import { MessageApi } from '../../../../api/message';
import { Money } from '../../../../api/banking';
import { Mml } from '../../../../api/mml';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Container } from '../../../../lib/spatial/Container';
import TipJar from '../../../thing/TipJar';
import Coin from '../../../thing/Coin';
import { Currency } from "../../../../lib/banking/Currency";

const TOPIC = 'act.deed';

type CollectModel = CommandModel;

export default class CollectController extends CommandController<CollectModel> {
  async execute(_model: CollectModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;

    // Only the on-shift bartender (an active maker) may collect.
    if (!MixinApi.isMaker(giver)) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You're not tending the bar — the tips aren't yours to take.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'not-on-shift',
        detail: 'collect',
      });
      return;
    }
    if (!MixinApi.isContainer(giver)) return;

    const jar = TipJar.resolveIn(context);
    if (!jar) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`There's no tip jar here to empty.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'no-jar',
        detail: 'collect',
      });
      return;
    }

    let took = 0;
    for (const c of [...jar.getContents()]) {
      if (c instanceof Coin) {
        took += c.getQuantity();
        ContainmentApi.move(c, giver as Stuff & Container);
      }
    }

    if (took === 0) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`The tip jar's empty.`)
        .send();
      return;
    }

    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`You scoop ${Money.of(took, Currency.compact()).render()} out of the tip jar.`)
      .toPeers(Mml.compose`${Mml.actor(giver)} empties the tip jar.`)
      .send();
  }
}
