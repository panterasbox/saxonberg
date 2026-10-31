/**
 * TieController — `tie <gear> to <load> [with <knot>]` (cordage D8; `lash`
 * is one of its words). ONE verb over the `Tieable` protocol: the gear —
 * a rope, a line's end, an air bag — decides what tying it means. The verb
 * renders.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';

interface TieModel extends CommandModel {
  gear: MqlOneResult;
  load: MqlOneResult;
  knot?: string;
}

export default class TieController extends CommandController<TieModel> {
  async execute(model: TieModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver as unknown as Stuff;
    const gear = model.gear?.stuff ?? null;
    const load = model.load?.stuff ?? null;
    if (gear === null || !MixinApi.isTieable(gear)) {
      return this.refuse(context, 'act.deed', 'You have nothing with an end to tie.', 'not-tieable');
    }
    if (load === null) return this.refuse(context, 'act.deed', 'Tie it to what?', 'no-load');
    const knot = (model.knot ?? '').trim();
    const out = await gear.tieTo(giver, load, knot === '' ? null : knot);
    if (!out.ok) return this.refuse(context, 'act.deed', out.line, out.reason);
    const scene = MessageApi.scene(giver).topic('act.deed').toSelf(Mml.compose`${out.line}`);
    if (out.peers) scene.toPeers(Mml.compose`${Mml.actor(giver)} ${out.peers}`);
    scene.send();
  }
}
