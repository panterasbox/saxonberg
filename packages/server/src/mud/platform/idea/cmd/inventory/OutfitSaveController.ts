/**
 * OutfitSaveController — `outfit save <name>`: record what is on right
 * now as an outfit (over {@link OutfitWearController}, whose keeper
 * precondition it shares). It was `outfit wear <name> --save`, then `equip
 * set save <name>` (controller-liquidity W7b), then this (W16).
 */

import type { CommandContext } from '../../../../api/command';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import { EquipControllerBase, type EquipModel } from './EquipControllerBase';
import OutfitWearController from './OutfitWearController';

export default class OutfitSaveController extends OutfitWearController {
  override async execute(model: EquipModel, context: CommandContext): Promise<void> {
    const held = this.setKeeper(model, context);
    if (held === null) return;
    const { giver, name } = held;
    /*
     * ⭐ Captured in WEAR ORDER. `wornStack()` is outermost-first, so
     * reversing it gives innermost-first — exactly the order a replay
     * must dress in for the covering ladder never to refuse. (The ladder
     * walk would sort it anyway; storing it right means the saved set
     * reads correctly to a human too.)
     */
    const keywords = [...giver.wornStack()]
      .reverse()
      .map((g) => {
        const asStuff = g as unknown as Stuff;
        return MixinApi.isPerceptible(asStuff)
          ? asStuff.getPrimaryKeyword()
          : undefined;
      })
      .filter((k): k is string => !!k);
    if (keywords.length === 0) {
      MessageApi.scene(giver)
        .topic(EquipControllerBase.TOPIC)
        .toSelf(Mml.compose`You aren't wearing anything to save.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'nothing-worn',
        detail: name,
      });
      return;
    }
    giver.setWardrobe(name, keywords);
    MessageApi.scene(giver)
      .topic(EquipControllerBase.TOPIC)
      .toSelf(Mml.compose`Saved outfit '${name}': ${keywords.join(', ')}.`)
      .send();
  }
}
