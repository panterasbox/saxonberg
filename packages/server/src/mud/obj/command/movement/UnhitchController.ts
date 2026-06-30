/**
 * UnhitchController — release a hitched cart. Bare `unhitch` drops the
 * giver's own cart (self-haul); `unhitch <mount>` releases the cart a
 * draft animal pulls; `unhitch <cart>` releases that cart from whoever
 * pulls it. Graceful no-op decline when nothing is hitched.
 *
 * Validation surface (from `cmd/movement/unhitch.yaml`):
 *   - requiresAnimate (verb-level); mustBeVisible (target, optional)
 */

import { CommandController } from '../../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
} from '../../../api/command';
import type { MqlOneResult } from '../../../api/mql';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Hauler } from '../../../lib/slot/Hauler';
import { MessageApi } from '../../../api/message';
import { MixinApi } from '../../../api/mixin';
import { Mml } from '../../../api/mml';

interface UnhitchModel extends CommandModel {
  target?: MqlOneResult;
}

export default class UnhitchController extends CommandController<UnhitchModel> {
  execute(model: UnhitchModel, context: CommandContext): void {
    const giver = context.commandGiver;

    let hauler: (Stuff & Hauler) | null = null;
    const targetRes = model.target;
    if (targetRes && (targetRes.stuff || targetRes.raw)) {
      const t = targetRes.stuff;
      if (!t) {
        MessageApi.scene(giver)
          .topic('world.narration.action')
          .toSelf(Mml.compose`You don't see any '${targetRes.raw}' here.`)
          .send();
        context.note({
          kind: 'empty-result',
          field: 'target',
          query: targetRes.raw,
        });
        return;
      }
      // A hauler creature → unhitch it; a cart → unhitch its hauler.
      if (MixinApi.isHauling(t)) hauler = t;
      else if (MixinApi.isHaulable(t)) hauler = t.getHauledBy();
    } else if (MixinApi.isHauling(giver)) {
      hauler = giver;
    }

    if (!hauler || !hauler.isHitched()) {
      MessageApi.scene(giver)
        .topic('world.narration.action')
        .toSelf(Mml.compose`There's nothing to unhitch.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'not-hitched',
        detail: 'no cart is being hauled',
      });
      return;
    }

    const cart = hauler.getHauledCart()!;
    hauler.unhitch();
    if ((hauler as unknown as Stuff).stuffId === giver.stuffId) {
      MessageApi.scene(giver)
        .topic('world.narration.action')
        .toSelf(Mml.compose`You let go of ${Mml.item(cart)}.`)
        .toPeers(Mml.compose`${Mml.name(giver)} lets go of ${Mml.item(cart)}.`)
        .send();
    } else {
      const beast = hauler as unknown as Stuff;
      MessageApi.scene(giver)
        .topic('world.narration.action')
        .toSelf(
          Mml.compose`You unhitch ${Mml.item(cart)} from ${Mml.item(beast)}.`,
        )
        .toPeers(
          Mml.compose`${Mml.name(giver)} unhitches ${Mml.item(cart)} from ${Mml.item(beast)}.`,
        )
        .send();
    }
  }
}
