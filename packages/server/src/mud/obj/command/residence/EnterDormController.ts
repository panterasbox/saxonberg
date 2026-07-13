/**
 * EnterDormController — the `enter` verb (the `residence` category). The
 * player-facing "go into my dorm room" action: from your floor's corridor,
 * unlock your lease-gated `DormDoor` and walk through it into your room.
 *
 * Flow: resolve the giver's held unit (`ParcelApi.heldUnitOf`) → ensure its
 * floor + door are live (`ensureFloor` / `ensureUnitDoor`) → `door.unlock()`
 * (lease-gated, actor from execution context — a non-holder is refused) →
 * traverse the giver through the door via `LocomotionApi.traverseWithDefault`
 * (the door's `resolveDestination` materializes the room). Leaseholder-only;
 * a non-holder is told they hold no lease.
 *
 * v1 convenience over the raw walk (the door + `up`-stair chain still exist);
 * an in-corridor `open <door>` + plain `go` is the deferred Phase-7 polish.
 */

import { CommandController } from '../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../api/command';
import { MessageApi } from '../../../api/message';
import { Mml } from '../../../api/mml';
import { ParcelApi } from '../../../api/parcel';
import { LocomotionApi } from '../../../api/locomotion';
import { MixinApi } from '../../../api/mixin';
import { ParcelRecord } from '../../../lib/parcel/ParcelRecord';
import DormWarren from '../../../domain/eternal/duncan-hall/DormWarren';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Mobile } from '../../../lib/spatial/Mobile';
import type { Containable } from '../../../lib/spatial/Containable';
import type Exit from '../../../lib/boundary/Exit';

const TOPIC = 'residence.enter';

export default class EnterDormController extends CommandController<CommandModel> {
  async execute(_model: CommandModel, context: CommandContext): Promise<void> {
    const actor = context.commandGiver as Stuff;
    const holder = actor.getTemplatePath() ?? '';
    const unit = holder ? await ParcelApi.heldUnitOf(holder) : null;
    if (!unit) {
      return this.fail(context, "You don't hold a dorm lease.", 'no-lease');
    }
    const unitExtent = unit.getExtent();
    const slot = ParcelRecord.slotOfExtent(unitExtent);
    if (!slot) {
      return this.fail(context, 'Your dorm has no valid location.', 'bad-slot');
    }

    const warren = await DormWarren.resolve();
    await warren.ensureFloor(slot.floor);
    await warren.ensureUnitDoor(unitExtent);
    const door = warren.doorFor(unitExtent);
    if (!door) {
      return this.fail(context, "Your room's door won't materialize.", 'no-door');
    }

    try {
      await door.unlock(); // lease-gated (throws for a non-holder)
    } catch (err) {
      return this.fail(context, (err as Error).message, 'locked');
    }

    if (!MixinApi.isMobile(actor) || !MixinApi.isContainable(actor)) {
      return this.fail(context, "You can't move on your own.", 'not-mobile');
    }
    await LocomotionApi.traverseWithDefault(
      actor as Stuff & Mobile & Containable,
      door as unknown as Exit,
    );
  }

  private fail(
    context: CommandContext,
    detail: string,
    reason: string,
  ): void {
    MessageApi.scene(context.commandGiver)
      .topic(TOPIC)
      .toSelf(Mml.fromMarkup(`\n${detail}\n`))
      .send();
    context.note({ kind: 'controller-rejected', reason, detail });
  }
}
