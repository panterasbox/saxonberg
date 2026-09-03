/**
 * HangController — `hang X` / `mount X`: put a carried fixture on the
 * wall of the room you are standing in.
 *
 * The one act that turns a good you bought into a room that is yours
 * (residences D11). A sconce, a picture, a wall screen — anything
 * composing `AdornmentMixin` — leaves your hands and joins the room's
 * `Adornable` fixture map, where it is no longer loose clutter on the
 * floor and no longer moves with you.
 *
 * The three steps, in this order and no other:
 *
 *   1. `ContainmentApi.move(item, null)` — out of custody first. The
 *      not-portable invariant forbids an attached Adornment from
 *      sitting in any container's contents, so attaching before
 *      detaching would leave the graph in a state the pre-flight
 *      refuses to unwind.
 *   2. `room.addFixture(item, 'mounted:<chattelId>')` — the mount. The
 *      slot name is minted from the good's own chattel id so it is
 *      stable across restarts and can never collide with the synthetic
 *      `fixture:<n>` counter the authored `adornments:` field uses.
 *   3. `item.followCustody()` — the placement record follows
 *      where the thing ended up, exactly as it does for `drop` and
 *      `put`. A hung good's nearest persistence host is what it adorns,
 *      so this writes the room's place id and the estate entry picks up
 *      the mount slot on the way past.
 *
 * Title is NOT checked here: hanging your own lamp on somebody's wall
 * is giving them a lamp, not taking anything, and it stays your lamp
 * (it persists owner-side and comes down with you). Taking one down is
 * the guarded half — see `GetController`.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Adornment } from '../../../../lib/boundary/Adornment';
import { ContainmentApi } from '../../../../api/containment';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';
import { ChattelApi } from '../../../../api/chattel';

interface HangModel extends CommandModel {
  item: MqlOneResult;
}

export default class HangController extends CommandController<HangModel> {
  async execute(model: HangModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const item = model.item.stuff;

    if (!item) {
      MessageApi.scene(giver)
        .topic('sense.survey')
        .toSelf(Mml.compose`You don't have any '${model.item.raw}'.`)
        .send();
      context.note({
        kind: 'empty-result',
        field: 'item',
        query: model.item.raw,
      });
      return;
    }

    const room = context.location;
    if (!room || !MixinApi.isAdornable(room)) {
      context.note({
        kind: 'controller-rejected',
        reason: 'nowhere-to-hang',
        detail: 'nowhere here to hang it',
      });
      MessageApi.scene(giver)
        .topic('sense.survey')
        .toSelf(Mml.compose`There's nothing here to hang ${Mml.thing(item)} on.`)
        .send();
      return;
    }

    // The field's `requires: AdornmentMixin` already gated this; the
    // narrow is for TypeScript and for a programmatic caller.
    if (!MixinApi.isAdornment(item)) {
      context.note({
        kind: 'controller-rejected',
        reason: 'not-hangable',
        detail: `${item.getPresentation()} does not hang`,
      });
      MessageApi.scene(giver)
        .topic('sense.survey')
        .toSelf(
          Mml.compose`${Mml.thing(item)} isn't made to go on a wall.`,
        )
        .send();
      return;
    }

    if (item.getAdornedTo()) {
      context.note({
        kind: 'controller-rejected',
        reason: 'already-hung',
        detail: `${item.getPresentation()} is already hung`,
      });
      MessageApi.scene(giver)
        .topic('sense.survey')
        .toSelf(Mml.compose`${Mml.thing(item)} is already up.`)
        .send();
      return;
    }

    if (!MixinApi.isContainable(item)) {
      throw new Error(
        `HangController: item ${item.stuffId} is not Containable`,
      );
    }

    ContainmentApi.move(item, null);
    room.addFixture(item as Stuff & Adornment, this.slotFor(item));
    if (MixinApi.isChattel(item)) await item.followCustody();

    MessageApi.scene(giver)
      .topic('sense.survey')
      .toSelf(Mml.compose`You hang ${Mml.thing(item)} on the wall.`)
      .toPeers(
        Mml.compose`${Mml.actor(giver)} hangs ${Mml.thing(item)} on the wall.`,
      )
      .send();
  }

  /**
   * The mount slot name. Keyed on the good's chattel id so the same lamp
   * lands in the same slot every restart; an unstamped fixture (nobody
   * owns it) falls back to the host's synthetic counter, which is what
   * an authored adornment gets.
   */
  private slotFor(item: Stuff): string | undefined {
    if (!MixinApi.isChattel(item)) return undefined;
    const id = item.getChattelId();
    return id ? `mounted:${id}` : undefined;
  }
}
