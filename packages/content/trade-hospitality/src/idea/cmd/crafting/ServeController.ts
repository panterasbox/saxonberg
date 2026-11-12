/**
 * ServeController — `serve <patron> <cocktail> [with <brand>]`.
 *
 * A maker verb (maker = the giver, via `makerMode: 'self'`). Makes the
 * cocktail from reachable matter and hands it to the patron. General to any
 * agent — only the economic gating (charging for the stock) is deferred.
 */

import type { CommandContext } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import MixController, { type MixModel } from './MixController';

const TOPIC = 'act.deed';

interface ServeModel extends MixModel {
  patron: MqlOneResult;
}

/** `mix`, handed to a patron — the same making (`MixController.mixInto`). */
export default class ServeController extends MixController<ServeModel> {
  override async execute(model: ServeModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const patron = model.patron.stuff;
    if (!patron) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You don't see any '${model.patron.raw}' to serve.`)
        .send();
      context.note({ kind: 'empty-result', field: 'patron', query: model.patron.raw });
      return;
    }
    const drink = await this.mixInto(model, context, patron, 'serve');
    if (!drink) return;
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.compose`You make ${Mml.thing(drink)} and hand it to ${Mml.actor(patron)}.`)
      .toTarget(patron, Mml.compose`${Mml.actor(giver)} makes you ${Mml.thing(drink)}.`)
      .toPeers(Mml.compose`${Mml.actor(giver)} serves ${Mml.actor(patron)} ${Mml.thing(drink)}.`)
      .send();
  }
}
