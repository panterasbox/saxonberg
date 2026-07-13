/**
 * WindController — `wind [<watch>]`.
 *
 * Winds a carried `Watch`'s mainspring back to full so it resumes
 * ticking. Resolves the target from a named/reachable object when given,
 * otherwise scans the actor's inventory for the first watch in hand.
 * Refuses with a controller-rejected note when there's no windable watch.
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
import Watch from '../../Watch';

interface WindModel extends CommandModel {
  target?: MqlOneResult;
}

export default class WindController extends CommandController<WindModel> {
  execute(model: WindModel, ctx: CommandContext): void {
    const giver = ctx.commandGiver;
    const watch = resolveWatch(giver as Stuff, model.target);
    if (!watch) {
      ctx.note({
        kind: 'controller-rejected',
        reason: 'no-watch',
        detail: 'no watch to wind',
      });
      MessageApi.scene(giver)
        .topic('world.narration.action')
        .toSelf(Mml.compose`You have no watch to wind.`)
        .send();
      return;
    }

    watch.wind();

    MessageApi.scene(giver)
      .topic('world.narration.action')
      .toSelf(
        Mml.compose`You wind ${Mml.object(watch as unknown as Stuff)}; the mainspring tightens with a soft ratchet.`,
      )
      .toPeers(
        Mml.compose`${Mml.name(giver)} winds ${Mml.object(watch as unknown as Stuff)}.`,
      )
      .send();
  }
}

/**
 * Resolve the watch to operate on: the named/reachable object if one was
 * given, otherwise the first watch in the actor's own inventory. Folded
 * into the controller (not a free-floating helper) — it is the device
 * verbs' one shared resolution shape.
 */
function resolveWatch(
  giver: Stuff,
  target: MqlOneResult | undefined,
): Watch | null {
  if (target && target.stuff instanceof Watch) {
    return target.stuff;
  }
  if (target && target.stuff !== null && target.stuff !== undefined) {
    // A target was named but it isn't a watch — reject rather than
    // silently grabbing a different item from the pocket.
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
