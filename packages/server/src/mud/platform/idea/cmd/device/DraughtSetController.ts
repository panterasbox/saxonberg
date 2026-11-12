/**
 * DraughtSetController — `draught <setting> [at <fire>]` and
 * `draught <fire> <setting>`: set how much air a fire draws (over {@link
 * DraughtControllerBase}). Two shapes, one act.
 */

import type { CommandContext } from '../../../../api/command';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { DraughtControllerBase, type DraughtModel } from './DraughtControllerBase';

export default class DraughtSetController extends DraughtControllerBase {
  execute(model: DraughtModel, context: CommandContext): void {
    const burner = this.fireOf(model, context);
    if (!burner) return;

    // ⭐ The ladder's words are the burner's one vocabulary (W8).
    const value: number | null = burner.draughtFor(model.setting ?? '');
    if (value === null) {
      // ⚠ Unreachable through the view, whose `values:` are exactly
      // these five words — kept because a controller that trusted its
      // binder and was wrong would set a fire's draught to `NaN`.
      const detail = 'Set it wide, half, low or banked.';
      MessageApi.scene(context.commandGiver)
        .topic('act.deed')
        .toSelf(Mml.compose`${detail}`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'bad-setting',
        detail,
      });
      return;
    }

    // ⭐⭐ Captured BEFORE the set, and as a STRING. `draught banked`
    // takes the light out of the room, and `Mml.thing` is LAZY — it
    // resolves when the scene is sent, so the peers' line named a forge
    // nobody could see any more. Same hazard as `cover`, and the live
    // drive is what showed it.
    const fireName = burner.getPresentation();
    burner.setDraught(value);
    MessageApi.scene(context.commandGiver)
      .topic('act.deed')
      .toSelf(Mml.compose`${DraughtControllerBase.narrate(value)}`)
      .toPeers(
        Mml.compose`${Mml.actor(context.commandGiver)} works the vents on ${fireName}.`,
      )
      .send();
  }
}
