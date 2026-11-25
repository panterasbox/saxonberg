/**
 * HerdEnterController — `herd enter <animal> in <herd>` (organism-biology
 * D8): a drafted head written into another register. The register decides
 * (`HerdRegistry.refile`, through `Livestock.enterHerd`); the reason rows
 * word every refusal. This file is the words of success.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import HerdRegistry from '../../HerdRegistry';
import Livestock from '../../../agent/Livestock';
import { HERD_REGISTRY_PATH, RANCHING_TOPIC } from './DraftController';

interface HerdEnterModel extends CommandModel {
  animal?: MqlOneResult;
  herd?: string;
}

export default class HerdEnterController extends CommandController<HerdEnterModel> {
  async execute(model: HerdEnterModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const animal = model.animal?.stuff as Stuff | undefined;
    if (!(animal instanceof Livestock)) {
      return this.refuse(context, { ok: false, reason: '/trade/ranching/reasons/not-drafted' });
    }
    const registry = await StuffApi.singleton<HerdRegistry>(HERD_REGISTRY_PATH);
    const where = MixinApi.isContainable(giver) ? giver.getContainer() : null;
    const herd = await registry.pick(model.herd, where);
    if (!herd) return this.refuse(context, { ok: false, reason: '/trade/ranching/reasons/no-herd' });
    const answer = await animal.enterHerd(herd.herdId, giver as unknown as Stuff);
    if (!answer.ok) return this.refuse(context, answer);
    MessageApi.scene(giver)
      .topic(RANCHING_TOPIC)
      .toSelf(Mml.compose`You write ${Mml.thing(animal)} into ${answer.herd.name}, number ${answer.index}.`)
      .toPeers(Mml.compose`${Mml.actor(giver)} writes a line in a herd book.`)
      .send();
  }
}
