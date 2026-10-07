/**
 * CoverController — `cover [<fire>]`.
 *
 * ⭐⭐ Bank a fire. The word is the curfew bell's — *couvre-feu*, cover
 * the fire — and this game's locality fire ordinance is already called a
 * curfew, so it is the right word rather than the free one. See
 * `cover.yaml`'s header for the collision it resolves and how.
 *
 * ⭐ There is no banking MECHANISM: this sets the draught to its floor,
 * which is all banking has ever been. *Bank it, leave, come back to it
 * still in* is therefore arithmetic — a twentieth of the rate for twenty
 * times as long — and not a feature anybody has to maintain.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import { MqlApi, type MqlOneResult } from '../../../../api/mql';
import { MixinApi } from '../../../../api/mixin';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { AppApi } from '../../../../api/app';
import { AppSettingKeys } from '../../../../lib/config/AppSettings';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Burner } from '../../../../lib/fire/Burner';

interface CoverModel extends CommandModel {
  fire?: MqlOneResult;
}

/** The banked floor — the same dial `draught banked` reads. */
function bankedFloor(): number {
  try {
    const raw = AppApi.setting(AppSettingKeys.fireDraughtBanked);
    if (raw == null || raw === '') return 0.05;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : 0.05;
  } catch {
    return 0.05;
  }
}

export default class CoverController extends CommandController<CoverModel> {
  execute(model: CoverModel, context: CommandContext): void {
    const { commandGiver } = context;
    const fireResult = model.fire;
    const fire = fireResult
      ? MqlApi.effectiveTarget(fireResult, (s): s is Stuff =>
          MixinApi.isBurner(s),
        )
      : null;
    if (!fire) {
      MessageApi.scene(commandGiver)
        .topic('act.deed')
        .toSelf(Mml.compose`There is no fire here to cover.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'no-burner',
        detail: 'there is no fire here to cover',
      });
      return;
    }
    const burner = fire as Stuff & Burner;
    if (!burner.isLit()) {
      MessageApi.scene(commandGiver)
        .topic('act.deed')
        .toSelf(Mml.compose`${Mml.thing(fire)} is already out.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'not-lit',
        detail: 'it is already out',
      });
      return;
    }

    burner.setDraught(bankedFloor());
    MessageApi.scene(commandGiver)
      .topic('act.deed')
      .toSelf(
        Mml.compose`You rake ${Mml.thing(fire)} down and cover it with its own ash. A dull red glow, and it will keep.`,
      )
      .toPeers(
        Mml.compose`${Mml.actor(commandGiver)} covers ${Mml.thing(fire)} for the night.`,
      )
      .send();
  }
}
