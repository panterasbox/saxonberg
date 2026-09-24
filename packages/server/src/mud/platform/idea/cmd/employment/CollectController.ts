/**
 * CollectController — `collect [tips]`.
 *
 * The on-shift bartender scoops the tip jar into their own holdings — the
 * whole lot, off every ledger. Gated on being the present, active maker
 * (`Employed.isFulfilling`, which is on-shift-aware): only whoever is actually
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
import { MqlApi } from '../../../../api/mql';
import { BankingApi } from '../../../../api/banking';

const TOPIC = 'act.deed';

interface CollectModel extends CommandModel {
}

export default class CollectController extends CommandController<CollectModel> {
  async execute(model: CollectModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;

    // Only the on-shift bartender (an active maker) may collect.
    if (!MixinApi.isEmployed(giver) || !giver.isFulfilling()) {
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

    // ⭐ Bound by the view, not hunted for here.
    // ⚠ Resolved here, not declared in the view, because a `type: object`
    // arg must name a capability mixin (`lint:arg-kinds`) and this
    // class has none — only `DetailedMixin`, which would offer the verb
    // on every detailed thing. Becomes a declared arg the day it gets one.
    const jar = (MqlApi.resolveOne('reachable:[class.TipJar]', {
      commandGiver: context.commandGiver,
      scope: 'reachable',
    }).stuff as TipJar | null);
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
      .toSelf(Mml.compose`You scoop ${Money.of(took, BankingApi.compactCurrency()).render()} out of the tip jar.`)
      .toPeers(Mml.compose`${Mml.actor(giver)} empties the tip jar.`)
      .send();
  }
}
