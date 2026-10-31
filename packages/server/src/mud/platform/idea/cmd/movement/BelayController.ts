/**
 * BelayController — `belay <person>` / `belay off` (cordage D12). The rope
 * in the belayer's hands decides whether it can be a belay; the verb finds
 * that rope and renders.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Engaged } from '../../../../lib/activity/Engaged';
import { BELAY_TYPE } from '../../../../lib/locomotion/BelayEngagement';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { SchedulerApi } from '../../../../api/scheduler';
import { Mml } from '../../../../api/mml';
import Rope from '../../../thing/Rope';

interface BelayModel extends CommandModel {
  person: MqlOneResult;
  rope?: MqlOneResult;
}

export default class BelayController extends CommandController<BelayModel> {
  async execute(model: BelayModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver as unknown as Stuff;
    const word = (model.person?.raw ?? '').trim().toLowerCase();
    if (word === 'off') {
      if (MixinApi.isEngaged(giver)) SchedulerApi.cancelByType(giver as Stuff & Engaged, BELAY_TYPE);
      MessageApi.scene(giver).topic('act.deed').toSelf(Mml.compose`You let the belay go.`).send();
      return;
    }
    const person = model.person?.stuff ?? null;
    if (person === null || !person.isAgent?.()) {
      return this.refuse(context, 'act.deed', 'Belay whom?', 'no-person');
    }
    const bound = model.rope?.stuff ?? null;
    const rope = bound instanceof Rope ? bound : null;
    if (rope === null) return this.refuse(context, 'act.deed', 'You are holding no rope to belay with.', 'no-rope');
    const out = rope.belayFor(giver, person);
    if (!out.ok) return this.refuse(context, 'act.deed', out.line, out.reason);
    const scene = MessageApi.scene(giver).topic('act.deed').toSelf(Mml.compose`${out.line}`);
    if (out.peers) scene.toPeers(Mml.compose`${Mml.actor(giver)} ${out.peers}`);
    scene.send();
  }
}
