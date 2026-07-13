/**
 * SetController — `set <watch> <HH:MM>`.
 *
 * Sets a carried `Watch`'s hands to an explicit time (24-hour `HH:MM`).
 * There is no clock to sync to — the player reads the tower and dials it
 * in by hand, which is exactly why the watch drifts. Rejects a missing /
 * non-watch target and an unparseable time.
 */

import { CommandController } from '../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../api/command';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Container } from '../../../lib/spatial/Container';
import type { MqlOneResult } from '../../../api/mql';
import { MixinApi } from '../../../api/mixin';
import { ContainmentApi } from '../../../api/containment';
import { MessageApi } from '../../../api/message';
import { Mml } from '../../../api/mml';
import { Time } from '../../../lib/time/Time';
import Watch from '../../Watch';

interface SetModel extends CommandModel {
  target?: MqlOneResult;
  time?: string;
}

export default class SetController extends CommandController<SetModel> {
  execute(model: SetModel, ctx: CommandContext): void {
    const giver = ctx.commandGiver;
    const watch = resolveWatch(giver as Stuff, model.target);
    if (!watch) {
      ctx.note({
        kind: 'controller-rejected',
        reason: 'no-watch',
        detail: 'no watch to set',
      });
      MessageApi.scene(giver)
        .topic('world.narration.action')
        .toSelf(Mml.compose`You have no watch to set.`)
        .send();
      return;
    }

    const raw = (model.time ?? '').trim();
    let time: Time;
    try {
      time = Time.parse(raw);
    } catch {
      ctx.note({
        kind: 'controller-rejected',
        reason: 'bad-time',
        detail: `cannot read '${raw}' as a time`,
      });
      MessageApi.scene(giver)
        .topic('world.narration.action')
        .toSelf(Mml.compose`Set it to what time? Try 'HH:MM', like 4:00.`)
        .send();
      return;
    }

    watch.setTime(time.minutes);

    MessageApi.scene(giver)
      .topic('world.narration.action')
      .toSelf(
        Mml.compose`You thumb the crown and set ${Mml.object(watch as unknown as Stuff)} to ${time.format()}.`,
      )
      .toPeers(
        Mml.compose`${Mml.name(giver)} sets ${Mml.object(watch as unknown as Stuff)}.`,
      )
      .send();
  }
}

/**
 * Resolve the watch to operate on: the named/reachable object if given,
 * otherwise the first watch in the actor's own inventory. Folded into
 * the controller per the no-free-floating-helper convention.
 */
function resolveWatch(
  giver: Stuff,
  target: MqlOneResult | undefined,
): Watch | null {
  if (target && target.stuff instanceof Watch) {
    return target.stuff;
  }
  if (target && target.stuff !== null && target.stuff !== undefined) {
    return null;
  }
  const inv = MixinApi.isContainer(giver)
    ? ContainmentApi.getContents(giver as Stuff & Container)
    : [];
  for (const item of inv) {
    if (item instanceof Watch) return item;
  }
  return null;
}
