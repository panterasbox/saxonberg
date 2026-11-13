/**
 * OutfitWearController — `outfit wear <name>`: put a saved outfit on (over
 * {@link EquipControllerBase}). Recording one is `outfit save <name>`
 * ({@link OutfitSaveController}). It was `outfit wear <name>` until
 * controller-liquidity W16 flattened the nested subcommands.
 */

import type { CommandContext } from '../../../../api/command';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Wardrobe } from '../../../../lib/slot/Wardrobe';
import type { Attired } from '../../../../lib/slot/Attired';
import type { Slotted } from '../../../../lib/slot/Slotted';
import { EquipControllerBase, type EquipModel } from './EquipControllerBase';

export default class OutfitWearController extends EquipControllerBase {
  override async execute(model: EquipModel, context: CommandContext): Promise<void> {
    const held = this.setKeeper(model, context);
    if (held === null) return;
    const { giver, name } = held;
    const keywords = giver.getWardrobe(name);
    if (keywords.length === 0) {
      MessageApi.scene(giver)
        .topic(EquipControllerBase.TOPIC)
        .toSelf(Mml.compose`You have no outfit called '${name}'.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'unknown-outfit',
        detail: name,
      });
      return;
    }
    // A set is a list of KEYWORDS; equipping it is the ordinary
    // whole-kit walk over just those things, so the ladder sorts it the
    // same way and the skip report reads the same. Anything the set
    // names that you no longer have is simply not in the pool, and the
    // report says so.
    const pool = await this.pool(model, context, giver);
    if (pool === null) return;
    /*
     * ⚠ Matched on the PRIMARY keyword, which is what a set stores and
     * what the shipped `wear set` matched on. `hasKeyword` is wider and
     * looks like an improvement until two garments answer to the same
     * alias and a set starts putting on the wrong coat.
     *
     * ⭐ Ordered by the SET, not by the pool: a set is recorded
     * innermost-first, so replaying it in its own order is what makes
     * the ladder land the way it was saved.
     */
    const wanted: Stuff[] = [];
    for (const keyword of keywords) {
      const match = pool.find(
        (c) =>
          MixinApi.isPerceptible(c) &&
          c.getPrimaryKeyword() === keyword &&
          !wanted.includes(c),
      );
      if (match) wanted.push(match);
    }
    await this.equipAll(wanted, context, giver);
  }

  /**
   * The giver as an outfit keeper and the outfit's name, or a refusal said and
   * `null` — the precondition both outfit acts share.
   */
  protected setKeeper(
    model: EquipModel,
    context: CommandContext,
  ): { giver: Stuff & Wardrobe & Slotted & Attired; name: string } | null {
    const giver = context.commandGiver;
    const name = (model.name ?? '').trim();
    if (!MixinApi.isWardrobe(giver) || !MixinApi.isSlotted(giver) || !MixinApi.isAttired(giver)) {
      MessageApi.scene(giver)
        .topic(EquipControllerBase.TOPIC)
        .toSelf(Mml.compose`You can't keep outfits.`)
        .send();
      return null;
    }
    if (name === '') {
      MessageApi.scene(giver)
        .topic(EquipControllerBase.TOPIC)
        .toSelf(Mml.compose`Which outfit?`)
        .send();
      context.note({ kind: 'controller-rejected', reason: 'no-name', detail: '' });
      return null;
    }
    return { giver, name };
  }
}
