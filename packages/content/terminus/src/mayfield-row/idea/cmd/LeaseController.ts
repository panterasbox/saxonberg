/**
 * LeaseController — the `lease <player>` verb (a Mayfield Row *content*
 * verb: it hardcodes Seznick House). The landlord act one rung up the
 * ladder from the dorm's `provision`: mint a unit parcel at the lowest
 * free slot (`f<floor>-u<pos>`), lease it, key it fresh, and hand over
 * the key — the unit comes EMPTY (built-ins only, D9), and the ASCENT
 * GATE (P10) reads the condition of what the tenant already holds.
 *
 * Authorization is at `execute()` (a dialogue `dispatch` — Walter doing
 * his job — bypasses the `requiresWizard` validator): a wizard, or an
 * agent of the building's owner (a `mayfield-holdings` member).
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { AccessApi } from '@saxonberg/server/mud/api/access';
import { AppApi } from '@saxonberg/server/mud/api/app';
import { GroupApi } from '@saxonberg/server/mud/api/group';
import { ParcelApi } from '@saxonberg/server/mud/api/parcel';
import { CredentialApi } from '@saxonberg/server/mud/api/credential';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { Lock } from '@saxonberg/server/mud/lib/lock/Lock';
import { OuterWarren } from '@saxonberg/server/mud/lib/location/OuterWarren';
import { Character } from '@saxonberg/server/mud/lib/character/Character';
import type { ParcelOwner } from '@saxonberg/server/mud/lib/parcel/ParcelRecord';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';

const TOPIC = 'act.deed';

/** Seznick House's authored anchors — this is a content verb. */
export const BUILDING_EXTENT = '/world/terminus/mayfield-row/seznick-house';
export const BUILDING_PATH = `${BUILDING_EXTENT}/building`;
export const HOUSE_ADDRESS = 'terminus/mayfield-row/seznick-house';
const LOCK_TECH = 'pin-tumbler' as const;

interface LeaseModel extends CommandModel {
  player?: MqlOneResult;
}

/** The building surface this verb drives (the BuildingWarren row). */
interface BuildingView extends Stuff {
  capacity(): number;
  getPlatPlan(): { nextFreeSlot(taken: ReadonlySet<string>, cap: number): string | null };
  ensureEntry(key: string): Promise<void>;
  ensureNode(nodeId: string): Promise<unknown>;
  refreshProvisioned(): Promise<void>;
}

export default class LeaseController extends CommandController<LeaseModel> {
  async execute(model: LeaseModel, context: CommandContext): Promise<void> {
    const actor = context.commandGiver as Stuff;

    const building = await ParcelApi.coveringParcelOf(BUILDING_EXTENT);
    const owner = building?.getOwner();
    if (!owner) {
      return this.fail(
        context,
        'Seznick House has no owner of record to lease under.',
        'no-building-parcel',
      );
    }
    if (!(await LeaseController.isBuildingAgent(actor, owner))) {
      return this.fail(
        context,
        "You're not authorized to let Seznick House's rooms.",
        'not-authorized',
      );
    }

    const target = model.player?.stuff as Stuff | undefined;
    const playerPath = target?.getIdentityPath() ?? '';
    if (!target || !playerPath) {
      return this.fail(context, 'Lease a flat to whom?', 'no-player');
    }

    // One unit per tenant IN THIS BUILDING (the ladder means a dorm or a
    // lot elsewhere is fine — the scoped check, residences D16).
    if (await ParcelApi.heldUnitOf(playerPath, BUILDING_EXTENT)) {
      const who = target.getPresentation() ?? playerPath;
      return this.fail(context, `${who} already holds a flat here.`, 'already-housed');
    }

    // The ASCENT GATE (P10): the condition of what they already hold.
    const refusal = await LeaseController.ascentRefusal(playerPath);
    if (refusal) {
      return this.fail(context, refusal, 'ascent-condition');
    }

    // Lowest free slot from the plan, under the operator's cap (D10).
    const view = StuffApi.findByTemplatePath<BuildingView>(BUILDING_PATH);
    if (!view) {
      return this.fail(context, 'The house ledger is not standing.', 'no-building');
    }
    const children = await ParcelApi.childParcelsOf(BUILDING_EXTENT);
    if (children.length >= view.capacity()) {
      return this.fail(
        context,
        `Seznick House is full: ${children.length} of ${view.capacity()} ` +
          `units are taken.`,
        'at-capacity',
      );
    }
    const taken = new Set(
      children.map((c) => {
        const e = c.getExtent();
        return e.slice(e.lastIndexOf('/') + 1);
      }),
    );
    const leaf = view.getPlatPlan().nextFreeSlot(taken, view.capacity());
    if (!leaf) {
      return this.fail(context, 'No free unit slot.', 'at-capacity');
    }
    const unitExtent = `${BUILDING_EXTENT}/units/${leaf}`;

    await ParcelApi.subdivide(unitExtent, BUILDING_EXTENT, owner);
    await ParcelApi.grantUse(unitExtent, playerPath, null);

    // The domicile stamp (best-effort; persists-until-replaced).
    try {
      if (target instanceof Character) {
        target.setDomicileAddress(HOUSE_ADDRESS);
      }
    } catch {
      /* best-effort */
    }

    // Key the unit fresh and hand the tenant the key (D7).
    const keyway = Lock.mintKeyway();
    await ParcelApi.setKeyway(unitExtent, keyway);
    await CredentialApi.issueKey(target, keyway, LOCK_TECH);

    // Reflect into the (possibly-live) building now.
    await view.refreshProvisioned();
    await view.ensureEntry(unitExtent);

    const who = target.getPresentation() ?? playerPath;
    this.send(
      context,
      Mml.compose`\nLet ${unitExtent} to ${who}; the flat comes empty, and the key is theirs.\n`,
    );
  }

  /** A wizard, or an agent of the building's owner (Walter's authority —
   *  owner-conferred group membership; the isDormsAgent shape). */
  public static async isBuildingAgent(
    actor: Stuff,
    owner: ParcelOwner,
  ): Promise<boolean> {
    if (await AccessApi.isWizard(actor)) return true;
    const ref = await ParcelApi.resolveOwnerRef(owner);
    if (!ref) return false;
    const key = actor.getIdentityPath();
    return key ? GroupApi.isMember(key, ref) : false;
  }

  /** The ascent gate's read (P10) — shared with the sale chokepoint's
   *  shape: any held residential unit below the threshold refuses. */
  public static async ascentRefusal(holder: string): Promise<string | null> {
    let min = 0.5;
    try {
      const raw = Number.parseFloat(
        AppApi.setting('residence.ascent.minCondition'),
      );
      if (Number.isFinite(raw) && raw > 0) min = raw;
    } catch {
      /* cold cache — the shipped default */
    }
    for (const record of await ParcelApi.heldUnitsOf(holder)) {
      const extent = record.getExtent();
      let cond: { condition: number; band: string } | null = null;
      try {
        cond = await OuterWarren.conditionOf(extent);
      } catch {
        cond = null;
      }
      if (cond && cond.condition < min) {
        const leaf = extent.slice(extent.lastIndexOf('/') + 1);
        return (
          `Walter taps the letting board and doesn't move a tab: the home ` +
          `you already hold (${leaf}) is ${cond.band}. Put it right first.`
        );
      }
    }
    return null;
  }

  private send(context: CommandContext, body: Mml): void {
    MessageApi.scene(context.commandGiver).topic(TOPIC).toSelf(body).send();
  }

  private fail(context: CommandContext, detail: string, reason: string): void {
    this.send(context, Mml.fromMarkup(`\n${detail}\n`));
    context.note({ kind: 'controller-rejected', reason, detail });
  }
}
