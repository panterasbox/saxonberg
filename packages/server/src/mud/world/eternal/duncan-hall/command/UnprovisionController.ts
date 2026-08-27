/**
 * UnprovisionController — the `unprovision <player>` / `unlease <player>` verb
 * (a Duncan Hall *content* verb — content namespace
 * `world/eternal/duncan-hall/`, not a core command category). Ends a
 * tenant's dorm lease and reclaims the unit:
 * revoke the lease, revert the live room (no recapture races the delete),
 * clear the personalized D1 record, and retire the parcel so its slot frees
 * for reuse. Symmetric with `provision <player>` — you name the tenant, and
 * their held unit is resolved (`ParcelApi.heldUnitOf`); Katie dispatches
 * `unprovision $player` for a move-out.
 *
 * Flow (DECISION B/H): `ParcelApi.revokeUse(unit, holder)` →
 * `DormWarren.dropUnit(unit, {revert:true})` (`markForRevert` → tear down the
 * live room → drop from `_unitsByKey`, no recapture) → `deleteAllFor(unit)`
 * (clear the prose overlay record) → `ParcelApi.retire(unit)` (free the
 * slot) → `refreshProvisioned`. A live occupant is ejected to the floor
 * corridor first (best-effort).
 *
 * Authorization is at `execute()` (the real boundary — a forced dispatch
 * bypasses the validator): a wizard, or an agent of the dorms owner (Katie) —
 * see `isDormsAgent` in {@link ProvisionController}.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { ContainmentApi } from '../../../../api/containment';
import { ParcelApi } from '../../../../api/parcel';
import { PersistableApi } from '../../../../api/persistable';
import { MixinApi } from '../../../../api/mixin';
import ProvisionController from './ProvisionController';
import DormWarren from '../DormWarren';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Container } from '../../../../lib/spatial/Container';
import type { Containable } from '../../../../lib/spatial/Containable';

const TOPIC = 'act.deed';

interface UnprovisionModel extends CommandModel {
  player?: MqlOneResult;
}

export default class UnprovisionController extends CommandController<UnprovisionModel> {
  async execute(
    model: UnprovisionModel,
    context: CommandContext,
  ): Promise<void> {
    const actor = context.commandGiver as Stuff;

    // Authorization (execute-level, so a forced dispatch can't skip it).
    const dorms = await ParcelApi.coveringParcelOf(DormWarren.DORMS_EXTENT);
    const owner = dorms?.getOwner();
    if (!owner || !(await ProvisionController.isDormsAgent(actor, owner))) {
      return this.fail(
        context,
        "You're not authorized to end Duncan Hall dorm leases.",
        'not-authorized',
      );
    }

    // Resolve the tenant, then their held unit.
    const target = model.player?.stuff as Stuff | undefined;
    const playerPath = target?.getTemplatePath() ?? '';
    if (!playerPath) {
      return this.fail(context, 'End whose dorm lease?', 'no-player');
    }
    const held = await ParcelApi.heldUnitOf(playerPath);
    if (!held) {
      const who = target?.getPresentation() ?? playerPath;
      return this.fail(context, `${who} doesn't hold a dorm.`, 'not-housed');
    }
    const unit = held.getExtent();
    const record = held;

    // Revoke every active lease on the unit.
    for (const grant of record.getGrants()) {
      await ParcelApi.revokeUse(unit, grant.holder);
    }

    // Eject any live occupants to the floor corridor before the room dies
    // (best-effort; v1 expects a vacant/expired unit).
    const warren = DormWarren.peek();
    if (warren) {
      this.evacuate(warren, unit);
      // Revert + tear down the live room (no recapture), then clear the
      // record and free the slot.
      await warren.dropUnit(unit, { revert: true });
    }
    await PersistableApi.deleteAllFor(unit);
    await ParcelApi.retire(unit);
    if (warren) await warren.refreshProvisioned();

    this.send(
      context,
      Mml.compose`\nEnded the lease on ${unit}; the room reverts and its slot is free.\n`,
    );
  }

  /** Move any live occupants of the unit's room out to its floor corridor. */
  private evacuate(warren: DormWarren, unit: string): void {
    const room = warren.roomFor(unit);
    if (!room) return;
    const corridor = warren.corridorForUnit(unit);
    if (!corridor) return;
    for (const occ of room.getContents()) {
      if (!MixinApi.isHasInteractive(occ)) continue;
      try {
        ContainmentApi.move(
          occ as Stuff & Containable,
          corridor as Stuff & Container,
        );
      } catch {
        /* best-effort */
      }
    }
  }

  private send(context: CommandContext, body: Mml): void {
    MessageApi.scene(context.commandGiver).topic(TOPIC).toSelf(body).send();
  }

  private fail(
    context: CommandContext,
    detail: string,
    reason: string,
  ): void {
    this.send(context, Mml.fromMarkup(`\n${detail}\n`));
    context.note({ kind: 'controller-rejected', reason, detail });
  }
}
