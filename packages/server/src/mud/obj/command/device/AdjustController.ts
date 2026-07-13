/**
 * AdjustController — `adjust <timepiece> <HH:MM>`.
 *
 * Sets a reachable mechanical timepiece's hands to an explicit time
 * (24-hour `HH:MM`). There is no clock to sync to — the player reads the
 * tower and dials it in by hand, which is exactly why the movement
 * drifts. Gated by the MechanicalMovement capability the same way
 * `wind`/`switch`/`fold` are: the controller narrows the target with
 * `MixinApi.isMechanicalMovement` and rejects anything else. Rejects a
 * missing target and an unparseable time.
 */

import { CommandController } from '../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../api/command';
import { MqlApi, type MqlOneResult } from '../../../api/mql';
import { MixinApi } from '../../../api/mixin';
import { MessageApi } from '../../../api/message';
import { Mml } from '../../../api/mml';
import { Time } from '../../../lib/time/Time';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { MechanicalMovement } from '../../../lib/time/MechanicalMovement';

interface AdjustModel extends CommandModel {
  target?: MqlOneResult;
  time?: string;
}

export default class AdjustController extends CommandController<AdjustModel> {
  execute(model: AdjustModel, ctx: CommandContext): void {
    const { commandGiver } = ctx;
    const target = model.target;
    if (target === undefined) {
      MessageApi.scene(commandGiver)
        .topic('world.narration.action')
        .toSelf(Mml.compose`Adjust what?`)
        .send();
      ctx.note({
        kind: 'controller-rejected',
        reason: 'missing-target',
        detail: 'adjust what?',
      });
      return;
    }
    if (target.stuff === null) {
      MessageApi.scene(commandGiver)
        .topic('world.narration.action')
        .toSelf(Mml.compose`You don't see any '${target.raw}' here.`)
        .send();
      ctx.note({
        kind: 'empty-result',
        field: 'target',
        query: target.raw,
      });
      return;
    }

    const movement = MqlApi.effectiveTarget(
      target,
      (s): s is Stuff & MechanicalMovement =>
        MixinApi.isMechanicalMovement(s),
    );
    if (!movement) {
      MessageApi.scene(commandGiver)
        .topic('world.narration.action')
        .toSelf(Mml.compose`You can't adjust that.`)
        .send();
      ctx.note({
        kind: 'controller-rejected',
        reason: 'not-adjustable',
        detail: "can't adjust that",
      });
      return;
    }

    const raw = (model.time ?? '').trim();
    let time: Time;
    try {
      time = Time.parse(raw);
    } catch {
      MessageApi.scene(commandGiver)
        .topic('world.narration.action')
        .toSelf(
          Mml.compose`Adjust it to what time? Try 'HH:MM', like 4:00.`,
        )
        .send();
      ctx.note({
        kind: 'controller-rejected',
        reason: 'bad-time',
        detail: `cannot read '${raw}' as a time`,
      });
      return;
    }

    movement.setTime(time.minutes);

    MessageApi.scene(commandGiver)
      .topic('world.narration.action')
      .toSelf(
        Mml.compose`You thumb the crown and set ${Mml.object(movement as unknown as Stuff)} to ${time.format()}.`,
      )
      .toPeers(
        Mml.compose`${Mml.name(commandGiver)} sets ${Mml.object(movement as unknown as Stuff)}.`,
      )
      .send();
  }
}
