/**
 * BelayController — `belay <person> [with <rope>]` (cordage D12). The rope
 * in the belayer's hands decides whether it can be a belay; the verb
 * renders. One act: taking the rope off the belay is `untie <rope>`
 * (`Rope.untieBy`; controller-liquidity W7c — `belay off` retired, the
 * remedy ladder's rung 1 into an existing verb).
 */

import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import Rope from '../../../thing/Rope';
import { TieControllerBase } from '../inventory/TieControllerBase';

interface BelayModel extends CommandModel {
  person: MqlOneResult;
  rope?: MqlOneResult;
}

export default class BelayController extends TieControllerBase<BelayModel> {
  async execute(model: BelayModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver as unknown as Stuff;
    const person = model.person?.stuff ?? null;
    if (person === null || !person.isAgent?.()) {
      return this.refuse(context, 'act.deed', 'Belay whom?', 'no-person');
    }
    const bound = model.rope?.stuff ?? null;
    const rope = bound instanceof Rope ? bound : null;
    if (rope === null) return this.refuse(context, 'act.deed', 'You are holding no rope to belay with.', 'no-rope');
    const out = rope.belayFor(giver, person);
    if (!out.ok) return this.declineTie(context, out, giver);
    const scene = MessageApi.scene(giver).topic('act.deed').toSelf(Mml.compose`${out.line}`);
    if (out.peers) scene.toPeers(Mml.compose`${Mml.actor(giver)} ${out.peers}`);
    scene.send();
  }
}
