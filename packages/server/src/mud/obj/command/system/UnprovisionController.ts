/**
 * UnprovisionController — the `unprovision <unit>` / `unlease <unit>` verb
 * (the `system` category). Ends a dorm lease and reclaims the unit: revoke
 * the lease, revert the live room (no recapture races the delete), clear the
 * personalized D1 record, and retire the parcel so its slot frees for reuse.
 *
 * Flow (DECISION B/H): `ParcelApi.revokeUse(unit, holder)` →
 * `DormWarren.dropUnit(unit, {revert:true})` (`markForRevert` → tear down the
 * live room → drop from `_unitsByKey`, no recapture) → `deleteAllFor(unit)`
 * (clear the prose overlay record) → `ParcelApi.retire(unit)` (free the
 * slot) → `refreshProvisioned`. First cut assumes a vacant/expired unit; a
 * live occupant is ejected to the floor corridor first (best-effort).
 *
 * Operator-gated (`requiresWizard`, the operator-verb precedent).
 */

import { CommandController } from '../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../api/command';
import { MessageApi } from '../../../api/message';
import { Mml } from '../../../api/mml';
import { ContainmentApi } from '../../../api/containment';
import { ParcelApi } from '../../../api/parcel';
import { PersistableApi } from '../../../api/persistable';
import { MixinApi } from '../../../api/mixin';
import DormWarren from '../../../domain/eternal/duncan-hall/DormWarren';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Container } from '../../../lib/spatial/Container';
import type { Containable } from '../../../lib/spatial/Containable';

const TOPIC = 'system.residence';

interface UnprovisionModel extends CommandModel {
  unit?: string;
}

export default class UnprovisionController extends CommandController<UnprovisionModel> {
  async execute(
    model: UnprovisionModel,
    context: CommandContext,
  ): Promise<void> {
    const unit = (model.unit ?? '').trim();
    if (!unit) {
      return this.fail(context, 'Unprovision which unit?', 'no-unit');
    }

    // Verify the unit is a real child of the dorms parcel.
    const children = await ParcelApi.childParcelsOf(DormWarren.DORMS_EXTENT);
    const record = children.find((c) => c.getExtent() === unit);
    if (!record) {
      return this.fail(context, `No such dorm unit: ${unit}.`, 'no-such-unit');
    }

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
