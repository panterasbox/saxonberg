/**
 * HaulController — `haul [<thing>] [up|down]` (underwater D19): ONE verb
 * over the `Haulable` protocol. The thing decides; the verb renders.
 *
 * With nothing named, the one haulable thing within reach.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Haulable, HaulSense } from '../../../../lib/spatial/Haulable';
import { MessageApi } from '../../../../api/message';
import { MqlApi } from '../../../../api/mql';

interface HaulModel extends CommandModel {
  target?: MqlOneResult;
  sense?: string;
}

/** Does `s` speak the haul protocol? */
function isHaulable(s: Stuff | null | undefined): s is Stuff & Haulable {
  return s !== null && s !== undefined &&
    typeof (s as unknown as { haulBy?: unknown }).haulBy === 'function';
}

export default class HaulController extends CommandController<HaulModel> {
  async execute(model: HaulModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    let target: Stuff | null = model.target?.stuff ?? null;
    if (target === null && !model.target?.raw) {
      const reach = MqlApi.resolveMany('reachable', { commandGiver: giver, scope: 'reachable' });
      target = (reach.stuff ?? []).find((s) => isHaulable(s)) ?? null;
    }
    if (target === null) {
      const named = model.target?.raw;
      return this.refuse(
        context, 'act.deed',
        named ? `You see no ${named} to haul.` : 'There is nothing here to haul on.',
        'nothing-to-haul',
      );
    }
    if (!isHaulable(target)) {
      return this.refuse(context, 'act.deed', `You can't haul ${target.getPresentation()}.`, 'not-haulable');
    }
    const word = (model.sense ?? '').trim().toLowerCase();
    if (word !== '' && word !== 'up' && word !== 'down') {
      return this.refuse(context, 'act.deed', 'Haul it up, or down?', 'which-way');
    }
    const sense: HaulSense | null = word === '' ? null : (word as HaulSense);
    const out = await target.haulBy(giver, sense);
    if (!out.ok) return this.refuse(context, 'act.deed', out.line, out.reason);
    const scene = MessageApi.scene(giver).topic('act.deed').toSelf(out.self);
    if (out.peers) scene.toPeers(out.peers);
    scene.send();
  }
}
