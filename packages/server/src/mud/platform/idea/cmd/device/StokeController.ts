/**
 * StokeController — `stoke <fuel> [into <fire>]` / `fuel`.
 *
 * ⭐⭐ The act that makes a fire a thing you keep rather than a thing you
 * use up. Every refusal is the OBJECT answering for itself — a stone has
 * no heat of combustion, a sodden turf carries its own water, a full bed
 * is full — so none of them is a check this controller invented.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import { MqlApi, type MqlOneResult } from '../../../../api/mql';
import { MixinApi } from '../../../../api/mixin';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Burner, StokeOutcome } from '../../../../lib/fire/Burner';

interface StokeModel extends CommandModel {
  fuel?: MqlOneResult;
  burner?: MqlOneResult;
}

/** The refusal sentence for each reason — the fire's own words. */
function refusalFor(outcome: StokeOutcome & { ok: false }): string {
  switch (outcome.reason) {
    case 'not-fuel':
      return 'That will not burn.';
    case 'too-wet':
      return 'It is too sodden to catch.';
    case 'bed-full':
      return 'There is no room in it for that.';
    case 'no-bed':
      return 'That one is filled, not stoked — pour its fuel in.';
    case 'not-matter':
    default:
      return 'There is nothing of it to burn.';
  }
}

export default class StokeController extends CommandController<StokeModel> {
  execute(model: StokeModel, context: CommandContext): void {
    const { commandGiver } = context;
    const fuel = model.fuel;
    if (fuel === undefined) {
      MessageApi.scene(commandGiver)
        .topic('act.deed')
        .toSelf(Mml.compose`Stoke it with what?`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'missing-fuel',
        detail: 'stoke it with what?',
      });
      return;
    }
    if (fuel.stuff === null) {
      MessageApi.scene(commandGiver)
        .topic('act.deed')
        .toSelf(Mml.compose`You don't see any '${fuel.raw}' here.`)
        .send();
      context.note({ kind: 'empty-result', field: 'fuel', query: fuel.raw });
      return;
    }

    const burnerResult = model.burner;
    const burner = burnerResult
      ? MqlApi.effectiveTarget(burnerResult, (s): s is Stuff =>
          MixinApi.isBurner(s),
        )
      : null;
    if (!burner) {
      MessageApi.scene(commandGiver)
        .topic('act.deed')
        .toSelf(Mml.compose`There is no fire here to stoke.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'no-burner',
        detail: 'there is no fire here to stoke',
      });
      return;
    }

    const item = MqlApi.effectiveTarget(fuel, (s): s is Stuff => true);
    if (!item) {
      MessageApi.scene(commandGiver)
        .topic('act.deed')
        .toSelf(Mml.compose`You can't put that in a fire.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'not-matter',
        detail: "you can't put that in a fire",
      });
      return;
    }
    // ⚠ Stoking a fire with itself would destruct it mid-read.
    if (item === burner) {
      MessageApi.scene(commandGiver)
        .topic('act.deed')
        .toSelf(Mml.compose`It cannot burn itself.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'self-target',
        detail: 'it cannot burn itself',
      });
      return;
    }

    // ⭐⭐ The name has to be read BEFORE the stoke, and as a STRING.
    // A successful stoke destructs the item, and `Mml.thing` is LAZY —
    // it resolves its subject when the scene is sent, which is after the
    // destruct, and a destroyed Stuff's `describeFor` is an inert no-op
    // that answers `undefined`. The composer then escapes `undefined`
    // and throws. ⚠ Any verb that consumes its own target has to capture
    // the words, not a reference to the thing.
    const fuelName = item.getPresentation();
    const outcome = (burner as Stuff & Burner).stoke(item);
    if (!outcome.ok) {
      const detail = refusalFor(outcome);
      MessageApi.scene(commandGiver)
        .topic('act.deed')
        .toSelf(Mml.compose`${detail}`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: outcome.reason,
        detail,
      });
      return;
    }

    const lit = (burner as Stuff & Burner).isLit();
    const tail = lit ? ' The fire takes it.' : '';
    MessageApi.scene(commandGiver)
      .topic('act.deed')
      .toSelf(
        Mml.compose`You lay ${fuelName} in ${Mml.thing(burner)}.${tail}`,
      )
      .toPeers(
        Mml.compose`${Mml.actor(commandGiver)} lays ${fuelName} in ${Mml.thing(burner)}.`,
      )
      .send();
  }
}
