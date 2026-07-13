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
 * **Authorization is at `execute()`, not the validator** — the real boundary,
 * because a dialogue `dispatch` (Katie doing her job) `forceCommand`s this
 * verb, and `forced` bypasses the `requiresWizard` YAML validator. Allowed
 * iff the actor `isWizard` (operator) OR is an **agent of the dorms-parcel
 * owner** (a member of the `duncan-hall` group — the landlord's staff, which
 * is how Katie is authorized). The agency check does NOT use `AccessApi.can`
 * (it fails closed for NPCs, which have no `playerId`); it resolves the owner
 * group ref and checks membership by the actor's `playerId ?? templatePath`.
 * `requiresWizard` stays on the YAML affordance so only operators *see* the
 * raw verb.
 */

import { CommandController } from '../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../api/command';
import type { MqlOneResult } from '../../../api/mql';
import { MessageApi } from '../../../api/message';
import { Mml } from '../../../api/mml';
import { AccessApi } from '../../../api/access';
import { GroupApi } from '../../../api/group';
import { ParcelApi } from '../../../api/parcel';
import { CredentialApi } from '../../../api/credential';
import { Lock } from '../../../lib/lock/Lock';
import { ParcelRecord, type ParcelOwner } from '../../../lib/parcel/ParcelRecord';
import DormWarren from '../../../domain/eternal/duncan-hall/DormWarren';
import type { Stuff } from '../../../lib/stuff/Stuff';

const TOPIC = 'system.residence';

interface ProvisionModel extends CommandModel {
  player?: MqlOneResult;
}

export default class ProvisionController extends CommandController<ProvisionModel> {
  async execute(model: ProvisionModel, context: CommandContext): Promise<void> {
    const actor = context.commandGiver as Stuff;

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

    // The real authorization boundary (execute-level, so a forced dispatch
    // can't skip it): a wizard, or an agent of the dorms owner (Katie).
    if (!(await ProvisionController.isDormsAgent(actor, owner))) {
      return this.fail(
        context,
        "You're not authorized to lease out Duncan Hall's dorms.",
        'not-authorized',
      );
    }

    const target = model.player?.stuff as Stuff | undefined;
    const playerPath = target?.getTemplatePath() ?? '';
    if (!target || !playerPath) {
      return this.fail(context, 'Provision a dorm for whom?', 'no-player');
    }

    // One dorm per tenant — refuse a double-provision (keeps Katie's tree
    // simple: no lease-state guard needed).
    if (await ParcelApi.heldUnitOf(playerPath)) {
      const who = target?.getPresentation() ?? playerPath;
      return this.fail(
        context,
        `${who} already holds a dorm.`,
        'already-housed',
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

    // Key the unit's lock (a fresh keyway re-keys any prior tenant's key to
    // dead metal) and issue the tenant their key — a physical brass key in
    // hand plus an implant-keychain entry. The door checks the KEY, not
    // identity, so this is what actually lets them in.
    const keyway = Lock.mintKeyway();
    await ParcelApi.setKeyway(unitExtent, keyway);
    await CredentialApi.issueKey(target, keyway, DormWarren.DORM_LOCK_TECH);

    // Reflect the new unit into the (possibly-live) building now: hang the
    // door if its floor is already materialized, and refresh reachability +
    // the keyway cache.
    const warren = DormWarren.peek();
    if (warren) {
      await warren.ensureUnitDoor(unitExtent);
      await warren.refreshProvisioned();
    }

    const who = target?.getPresentation() ?? playerPath;
    this.send(
      context,
      Mml.compose`\nProvisioned ${unitExtent} and leased it to ${who}; handed over the key.\n`,
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

  /**
   * Whether `actor` may administer the dorms: a wizard (operator), or an
   * **agent of the dorms owner** — a member of the owner group (the
   * landlord's staff; how Katie is authorized). NOT via `AccessApi.can`,
   * which fails closed for NPCs (no `playerId`); membership is checked by the
   * actor's `playerId ?? templatePath` — the key each principal enrolled
   * under (a player by playerId, an NPC like Katie by templatePath). Shared
   * with `UnprovisionController` (a class static, not a free helper). A
   * first-class `AccessApi` NPC-agency predicate is the clean follow-on.
   */
  public static async isDormsAgent(
    actor: Stuff,
    owner: ParcelOwner,
  ): Promise<boolean> {
    if (await AccessApi.isWizard(actor)) return true;
    const ref = await ParcelApi.resolveOwnerRef(owner);
    if (!ref) return false;
    const key =
      (actor as unknown as { getPlayerId?: () => string }).getPlayerId?.() ??
      actor.getTemplatePath();
    return key ? GroupApi.isMember(key, ref) : false;
  }
}
