/**
 * DryRubController — `dry <thing> with <cloth>`: **rub it dry** (B56).
 *
 * ⭐ The second shape of `dry` (controller-liquidity W7c, D13 rung 4 — the
 * `throw` trio's rule): the same word, a disjoint syntax (`with` is
 * required), its own controller. Hanging a thing up is `DryController`.
 *
 * The cloth's act: a towel takes the water into itself, as much as it has
 * room for (`Wet.soakUp`); the outcome is the cloth's and this file words it.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import { MixinApi } from '../../../../api/mixin';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';

const TOPIC = 'act.deed';

export interface DryRubModel extends CommandModel {
  target?: MqlOneResult;
  cloth?: MqlOneResult;
}

export default class DryRubController extends CommandController<DryRubModel> {
  async execute(model: DryRubModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const target = model.target?.stuff ?? null;
    const cloth = model.cloth?.stuff ?? null;
    if (target === null || cloth === null) {
      this.refuse(context, TOPIC, 'Rub what dry, with what?', 'no-target');
      return;
    }
    // ⭐ The refusal names the PROPERTY: there must be water in it to take out.
    const wet = MixinApi.isWet(target) && target.getWetness() > 0.01;
    if (!wet) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`There is no water in ${Mml.thing(target)} to take out.`)
        .send();
      context.note({ kind: 'controller-rejected', reason: 'not-dryable' });
      return;
    }
    if (!MixinApi.isWet(cloth)) {
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`${Mml.thing(cloth)} will not take up water.`)
        .send();
      context.note({ kind: 'controller-rejected', reason: 'not-absorbent' });
      return;
    }
    const outcome = cloth.soakUp(target);
    if (!outcome.ok) {
      const line =
        outcome.reason === 'cloth-sodden'
          ? Mml.compose`${Mml.thing(cloth)} is sodden — it will take up no more.`
          : Mml.compose`${Mml.thing(target)} is dry already.`;
      MessageApi.scene(giver).topic(TOPIC).toSelf(line).send();
      context.note({ kind: 'controller-rejected', reason: outcome.reason });
      return;
    }
    const self = (target as Stuff) === (giver as Stuff);
    const left =
      outcome.left === 'dry'
        ? 'dry'
        : outcome.left === 'damp'
          ? 'only damp'
          : `still ${outcome.left}`;
    const towel =
      outcome.cloth === 'dry'
        ? ''
        : `, and ${outcome.cloth === 'soaked' ? 'it is soaked now' : `it is ${outcome.cloth} now`}`;
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(
        self
          ? Mml.compose`You rub yourself down with ${Mml.thing(cloth)}: you are ${left}${towel}.`
          : Mml.compose`You rub ${Mml.thing(target)} with ${Mml.thing(cloth)}: it is ${left}${towel}.`,
      )
      .toPeers(
        self
          ? Mml.compose`${Mml.actor(giver)} rubs down with ${Mml.thing(cloth)}.`
          : Mml.compose`${Mml.actor(giver)} rubs ${Mml.thing(target)} with ${Mml.thing(cloth)}.`,
      )
      .send();
  }
}
