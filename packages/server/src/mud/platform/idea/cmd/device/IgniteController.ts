/**
 * IgniteController — `ignite <thing>` / `light` / `kindle`.
 *
 * Sets fire to any Combustible in reach. The controller narrows the target
 * with `MixinApi.isCombustible` and routes the actual ignition through the
 * gated `FireApi.ignite`, which runs the fire-triangle checks (flammable +
 * dry-enough + fuel) and reports why it didn't catch.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import { MqlApi, type MqlOneResult } from '../../../../api/mql';
import { MixinApi } from '../../../../api/mixin';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { FireApi } from '../../../../api/fire';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Combustible } from '../../../../lib/fire/Combustible';

interface IgniteModel extends CommandModel {
  target?: MqlOneResult;
}

export default class IgniteController extends CommandController<IgniteModel> {
  execute(model: IgniteModel, context: CommandContext): void {
    const { commandGiver } = context;
    const target = model.target;
    if (target === undefined) {
      MessageApi.scene(commandGiver)
        .topic('act.deed')
        .toSelf(Mml.compose`Ignite what?`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'missing-target',
        detail: 'ignite what?',
      });
      return;
    }
    if (target.stuff === null) {
      MessageApi.scene(commandGiver)
        .topic('act.deed')
        .toSelf(Mml.compose`You don't see any '${target.raw}' here.`)
        .send();
      context.note({ kind: 'empty-result', field: 'target', query: target.raw });
      return;
    }

    const ignitable = MqlApi.effectiveTarget(
      target,
      (s): s is Stuff => MixinApi.isCombustible(s) || MixinApi.isBurner(s),
    );
    if (!ignitable) {
      MessageApi.scene(commandGiver)
        .topic('act.deed')
        .toSelf(Mml.compose`That won't burn.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'not-flammable',
        detail: "that won't burn",
      });
      return;
    }

    const outcome = (ignitable as Stuff & Combustible).ignite();
    if (!outcome.lit) {
      // ⭐⭐ `no-fuel` is a DIFFERENT refusal from `not-flammable`, and the
      // difference is the whole progression: a forge with an empty bed is
      // a fire waiting for somebody to stoke it, and the sentence has to
      // say so or the player has no way to find out what lifts it.
      const detail =
        outcome.reason === 'already-burning'
          ? 'It is already burning.'
          : outcome.reason === 'too-wet'
            ? "It's too wet to catch."
            : outcome.reason === 'no-fuel'
              ? 'There is no fuel in it. Stoke it first.'
              : "That won't burn.";
      MessageApi.scene(commandGiver)
        .topic('act.deed')
        .toSelf(Mml.compose`${detail}`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: outcome.reason ?? 'not-flammable',
        detail,
      });
      return;
    }

    MessageApi.scene(commandGiver)
      .topic('act.deed')
      .toSelf(Mml.compose`You set ${Mml.thing(ignitable)} alight.`)
      .toPeers(
        Mml.compose`${Mml.actor(commandGiver)} sets ${Mml.thing(ignitable)} alight.`,
      )
      .send();
  }
}
