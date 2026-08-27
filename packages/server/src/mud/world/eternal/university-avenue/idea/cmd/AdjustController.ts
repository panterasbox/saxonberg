/**
 * AdjustController — `adjust <timepiece> <HH:MM>`.
 *
 * Sets a reachable mechanical timepiece's hands to an explicit time
 * (24-hour `HH:MM`). There is no clock to sync to — the player reads the
 * tower and dials it in by hand, which is exactly why the movement
 * drifts. Gated by the `MechanicalMovementMixin` (lib/time) the same way
 * `wind` is: the controller narrows the target with a local mixin-presence
 * guard (`MixinApi.hasMixin(s, Mixins.MechanicalMovement)`) and rejects
 * anything else. `MechanicalMovement` is `lib/time` substrate, so this gate
 * lives in the bundle, not as a global `MixinApi.is*` predicate. Rejects a
 * missing target and an unparseable time.
 */

import { CommandController } from '../../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../../api/command';
import { MqlApi, type MqlOneResult } from '../../../../../api/mql';
import { MixinApi } from '../../../../../api/mixin';
import { Mixins } from '../../../../../lib/mixin';
import { MessageApi } from '../../../../../api/message';
import { Mml } from '../../../../../api/mml';
import { Time } from '../../../../../lib/time/Time';
import type { Stuff } from '../../../../../lib/stuff/Stuff';
import type { MechanicalMovement } from '../../../../../lib/time/MechanicalMovement';

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
        .topic('act.deed')
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
        .topic('act.deed')
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
        MixinApi.hasMixin(s, Mixins.MechanicalMovement),
    );
    if (!movement) {
      MessageApi.scene(commandGiver)
        .topic('act.deed')
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
        .topic('act.deed')
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
      .topic('act.deed')
      .toSelf(
        Mml.compose`You thumb the crown and set ${Mml.thing(movement as unknown as Stuff)} to ${time.format()}.`,
      )
      .toPeers(
        Mml.compose`${Mml.actor(commandGiver)} sets ${Mml.thing(movement as unknown as Stuff)}.`,
      )
      .send();
  }
}
