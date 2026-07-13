/**
 * ProvisionController — the `provision <player>` / `lease <player>` verb
 * (the `system` category). The landlord act that grows the elastic dorm
 * building: mint a unit parcel at the lowest-free slot, lease it to the
 * player, and (if that floor is already live) hang its door immediately.
 *
 * Flow: compute the **lowest-free slot** over the existing unit parcels
 * (`ParcelApi.childParcelsOf(dorms)` → first free `f<n>-r<p>` within
 * `ROOMS_PER_FLOOR`, reusing gaps left by unprovision before a new floor) →
 * `ParcelApi.subdivide(unitExtent, dorms, owner)` (owner inherited from the
 * dorms parcel; **no backing zone** — the extent is just the D1 + Warren
 * member key string) → `ParcelApi.grantUse(unitExtent, playerPath, null)`
 * (the lease) → `DormWarren.ensureUnitDoor` + `refreshProvisioned` so a live
 * floor shows the door + reachability updates now. The room / floor
 * materialize lazily on first entry (nothing is built here).
 *
 * Operator-gated (`requiresWizard`, the `reserve`/`house` operator-verb
 * precedent — operator == wizard in v1). Finer gating to the dorms-parcel
 * owner (`AccessApi` against the `duncan-hall` title) is the refinement seam
 * once the dorms parcel carries a resolvable zone resource.
 */

import { CommandController } from '../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../api/command';
import type { MqlOneResult } from '../../../api/mql';
import { MessageApi } from '../../../api/message';
import { Mml } from '../../../api/mml';
import { ParcelApi } from '../../../api/parcel';
import { ParcelRecord } from '../../../lib/parcel/ParcelRecord';
import DormWarren from '../../../domain/eternal/duncan-hall/DormWarren';
import type { Stuff } from '../../../lib/stuff/Stuff';

const TOPIC = 'system.residence';

interface ProvisionModel extends CommandModel {
  player?: MqlOneResult;
}

export default class ProvisionController extends CommandController<ProvisionModel> {
  async execute(model: ProvisionModel, context: CommandContext): Promise<void> {
    const target = model.player?.stuff as Stuff | undefined;
    const playerPath = target?.getTemplatePath() ?? '';
    if (!playerPath) {
      return this.fail(context, 'Provision a dorm for whom?', 'no-player');
    }

    // Inherit the owner from the dorms parcel (the landlord).
    const dorms = await ParcelApi.coveringParcelOf(DormWarren.DORMS_EXTENT);
    const owner = dorms?.getOwner();
    if (!owner) {
      return this.fail(
        context,
        'The dorms wing has no owner to lease under.',
        'no-dorms-parcel',
      );
    }

    // Lowest-free slot: the first `f<n>-r<p>` not already minted, scanning
    // floors from 1 and positions 1..ROOMS_PER_FLOOR (gap reuse before a
    // new floor).
    const children = await ParcelApi.childParcelsOf(DormWarren.DORMS_EXTENT);
    const taken = new Set(children.map((c) => c.getExtent()));
    const unitExtent = this.lowestFreeExtent(taken);

    await ParcelApi.subdivide(unitExtent, DormWarren.DORMS_EXTENT, owner);
    await ParcelApi.grantUse(unitExtent, playerPath, null);

    // Reflect the new unit into the (possibly-live) building now: hang the
    // door if its floor is already materialized, and refresh reachability.
    const warren = DormWarren.peek();
    if (warren) {
      await warren.ensureUnitDoor(unitExtent);
      await warren.refreshProvisioned();
    }

    const who = target?.getPresentation() ?? playerPath;
    this.send(
      context,
      Mml.compose`\nProvisioned ${unitExtent} and leased it to ${who}.\n`,
    );
  }

  /** The first free `…/dorms/f<n>-r<p>` extent (gap reuse, then a new floor). */
  private lowestFreeExtent(taken: Set<string>): string {
    for (let floor = 1; ; floor++) {
      for (let pos = 1; pos <= DormWarren.ROOMS_PER_FLOOR; pos++) {
        const extent = ParcelRecord.extentForSlot(
          DormWarren.DORMS_EXTENT,
          floor,
          pos,
        );
        if (!taken.has(extent)) return extent;
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
