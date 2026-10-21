/**
 * ImpressController — `impress <pattern> on|in <medium>` (alias `mold`).
 *
 * ⭐ Dumb (ceramics D21): pressing a hard shape into something soft is one
 * act, and the MEDIUM answers what it makes (`Impressible.takeImpression`)
 * — a leather-hard pot takes its maker's mark; a mould's soft medium takes
 * an impression of the whole pattern. This controller binds, asks, says.
 */

import { ManualBuildController } from './ManualBuildController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Impressible } from '../../../../lib/craft/Impressible';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';

interface ImpressModel extends CommandModel {
  pattern?: MqlOneResult;
  medium?: MqlOneResult;
}

/** Does this take an impression? Duck-probed — a protocol, not a mixin. */
function isImpressible(s: Stuff): s is Stuff & Impressible {
  return typeof (s as unknown as Partial<Impressible>).takeImpression === 'function';
}

export default class ImpressController extends ManualBuildController<ImpressModel> {
  async execute(model: ImpressModel, context: CommandContext): Promise<void> {
    const pattern = model.pattern?.stuff ?? null;
    const medium = model.medium?.stuff ?? null;
    if (pattern === null || medium === null) {
      this.declineStep(context, Mml.compose`Press what into what? Say \`impress stamp on jug\`.`, 'no-target');
      return;
    }
    if (pattern === medium) {
      this.declineStep(context, Mml.compose`You cannot press a thing into itself.`, 'self-target');
      return;
    }
    if (!isImpressible(medium)) {
      this.declineStep(
        context,
        Mml.compose`${Mml.thing(medium)} is not soft enough to take an impression.`,
        'not-impressible',
      );
      return;
    }
    // ⭐ A press is a moment, not a shift: it happens now, and a refusal
    // is the medium's own words on the command's own result.
    const giver = context.commandGiver;
    const out = await medium.takeImpression(pattern, giver);
    if (!out.ok) {
      this.declineStep(context, out.line, out.reason);
      return;
    }
    MessageApi.scene(giver)
      .topic('act.deed')
      .toSelf(out.line)
      .toPeers(Mml.compose`${Mml.actor(giver)} presses ${Mml.thing(pattern)} into ${Mml.thing(medium)}.`)
      .send();
  }
}
