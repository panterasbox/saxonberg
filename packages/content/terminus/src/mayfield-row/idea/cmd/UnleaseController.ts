/**
 * UnleaseController — the `unlease <player>` verb: end a Seznick House
 * lease and reclaim the unit (residences D9/D16). The tenant's owned
 * goods go to STORAGE — intact, titled, recoverable (`evictToStorage`,
 * never destructed) — then the shell reverts whole (the programme's
 * records delete), the slot frees, and the unit re-keys by retirement
 * (the parcel row dies and its keyway with it: the old key is dead
 * metal until a new lease mints a fresh one).
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { ChattelApi } from '@saxonberg/server/mud/api/chattel';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { ParcelApi } from '@saxonberg/server/mud/api/parcel';
import { PersistableApi } from '@saxonberg/server/mud/api/persistable';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import LeaseController, { BUILDING_EXTENT, BUILDING_PATH } from './LeaseController';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';

const TOPIC = 'act.deed';

const PROGRAMME_PATH = `${BUILDING_EXTENT}/unit-programme`;

interface UnleaseModel extends CommandModel {
  player?: MqlOneResult;
}

interface BuildingView extends Stuff {
  holdingFor(key: string): (Stuff & Container) | null;
  circulationForNode(nodeId: string): (Stuff & Container) | null;
  getPlatPlan(): { nodeOfSlot(leaf: string): string | null };
  dropHolding(key: string, opts?: { revert?: boolean }): Promise<void>;
  refreshProvisioned(): Promise<void>;
}

export default class UnleaseController extends CommandController<UnleaseModel> {
  async execute(model: UnleaseModel, context: CommandContext): Promise<void> {
    const actor = context.commandGiver as Stuff;

    const building = await ParcelApi.coveringParcelOf(BUILDING_EXTENT);
    const owner = building?.getOwner();
    if (!owner || !(await LeaseController.isBuildingAgent(actor, owner))) {
      return this.fail(
        context,
        "You're not authorized to end Seznick House leases.",
        'not-authorized',
      );
    }

    const target = model.player?.stuff as Stuff | undefined;
    const playerPath = target?.getIdentityPath() ?? '';
    if (!playerPath) {
      return this.fail(context, 'End whose lease?', 'no-player');
    }
    const held = await ParcelApi.heldUnitOf(playerPath, BUILDING_EXTENT);
    if (!held) {
      const who = target?.getPresentation() ?? playerPath;
      return this.fail(context, `${who} doesn't hold a flat here.`, 'not-housed');
    }
    const unit = held.getExtent();

    for (const grant of held.getGrants()) {
      await ParcelApi.revokeUse(unit, grant.holder);
    }

    // The unit's room keys — computable off the programme ROW, so a
    // dormant unit reverts without being woken.
    const floorplan = await this.floorplanOf();
    const roomKeys = floorplan.map((r) =>
      r.leaf ? `${unit}/${r.leaf}` : unit,
    );

    // 1. Owned goods → STORAGE, intact and titled (D9) — per room place
    //    (`<roomRow>#<roomKey>` — the estate's place identity).
    for (let i = 0; i < roomKeys.length; i++) {
      const row = floorplan[i]?.room;
      if (!row) continue;
      await ChattelApi.evictToStorage(`${row}#${roomKeys[i]}`);
    }

    // 2. Evacuate any live occupants to the landing (best-effort).
    const view = StuffApi.findByTemplatePath<BuildingView>(BUILDING_PATH);
    if (view) {
      this.evacuate(view, unit);
      // 3. Revert + tear the holding down whole (no recapture).
      await view.dropHolding(unit, { revert: true });
    }

    // 4. Clear every record under the unit (rooms + the programme's own).
    for (const key of roomKeys) {
      await PersistableApi.deleteAllFor(key);
    }
    await PersistableApi.deleteAllFor(unit);

    // 5. Free the slot; the keyway dies with the row (re-key by mint on
    //    the next lease).
    await ParcelApi.retire(unit);
    if (view) await view.refreshProvisioned();

    this.send(
      context,
      Mml.compose`\nEnded the lease on ${unit}; the tenant's goods are in storage, the flat reverts, and its slot is free.\n`,
    );
  }

  /** The programme row's floorplan (leaf + room row), read off the ROW
   *  so a dormant unit reverts without being woken. */
  private async floorplanOf(): Promise<
    Array<{ leaf?: string; room: string | null }>
  > {
    const { Template } = await import('@saxonberg/server/mud/lib/stuff/Template');
    const row = await Template.findByPath(PROGRAMME_PATH);
    const floorplan = (
      row?.data as { floorplan?: Array<Record<string, unknown>> }
    )?.floorplan;
    return (floorplan ?? []).map((r) => ({
      leaf: typeof r.leaf === 'string' ? (r.leaf as string) : undefined,
      room: typeof r.room === 'string' ? (r.room as string) : null,
    }));
  }

  private evacuate(view: BuildingView, unit: string): void {
    const holding = view.holdingFor(unit);
    if (!holding) return;
    const node = view.getPlatPlan().nodeOfSlot(unit.slice(unit.lastIndexOf('/') + 1));
    const landing = node ? view.circulationForNode(node) : null;
    if (!landing) return;
    const members = (
      holding as unknown as { getMembers?: () => Array<Stuff & Container> }
    ).getMembers?.();
    for (const room of members ?? [holding]) {
      for (const occ of room.getContents()) {
        if (!MixinApi.isHasInteractive(occ)) continue;
        try {
          ContainmentApi.move(occ as Stuff & Containable, landing);
        } catch {
          /* best-effort */
        }
      }
    }
  }

  private send(context: CommandContext, body: Mml): void {
    MessageApi.scene(context.commandGiver).topic(TOPIC).toSelf(body).send();
  }

  private fail(context: CommandContext, detail: string, reason: string): void {
    this.send(context, Mml.fromMarkup(`\n${detail}\n`));
    context.note({ kind: 'controller-rejected', reason, detail });
  }
}
