/**
 * Katie — Duncan Hall's live-in property manager (the housing-intake slice).
 *
 * A troll super who greets every new tenant on day one and finds them a room
 * — her clipboard IS the dorm manifest (the `DormWarren`), so when she "finds
 * you a room" the building buds a node. She fronts provisioning in the world
 * (`talk to Katie`), so a player never types the raw operator verb.
 *
 * She is almost entirely **content** (name + species + dispositions + an
 * intake dialogue tree in her seed). The ONE reason she needs a class: she
 * holds a **job**, and that job is a capability — she must be an *agent of
 * the dorms owner* to be authorized to `provision`/`unprovision`. So her
 * `postRegister` idempotently enrolls her into the `duncan-hall` managed
 * group (the landlord's staff), keyed by her templatePath (NPCs have no
 * playerId). The provisioning controllers authorize `isDormsAgent` — a
 * wizard, or a member of that group — so Katie's dialogue `dispatch` of
 * `provision $player` passes, and a random NPC's would not.
 *
 * The full character (the murder on-ramp, the clearing-hand, the ambient
 * maintenance routine, the code-switch enforcement beats) is deferred to the
 * EU narrative build — see
 * `docs/staging/eternal-university/npcs/property-manager.md`.
 */

import NPC from '../../../../lib/npc/NPC';
import { GroupApi } from '../../../../api/group';
import { KeyApi } from '../../../../api/key';
import { Group } from '../../../../lib/social/Group';

/** The landlord group that owns the dorms parcel (Katie's employer). */
const DORMS_GROUP = 'duncan-hall';

export default class Katie extends NPC {
  public override async postRegister(context?: unknown): Promise<void> {
    await super.postRegister(context);
    await this.enrollAsDormsAgent();
    // The super's master ring — a physical master key opening any pin-tumbler
    // dorm lock (her sheet's legitimate master access). An NPC has no implant
    // keychain, so it lives as the key on her belt. Best-effort: a missing key
    // template (a misconfigured boot) warns rather than crashing her setup.
    try {
      await KeyApi.issueMasterTo(this, 'pin-tumbler');
    } catch (err) {
      console.warn(
        `Katie.postRegister: could not issue the master key: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  /**
   * Idempotently enroll Katie into the `duncan-hall` managed group so she is
   * an agent of the dorms owner (authorized to provision/unprovision). Her
   * member key is her templatePath — the key the provisioning controllers
   * check for a non-player principal. Mint-or-find mirrors
   * `ParcelRegistry.resolveGroupByName` (the dorms owner resolves to the same
   * group by name).
   */
  private async enrollAsDormsAgent(): Promise<void> {
    const path = this.getTemplatePath();
    if (!path) return;
    const reg = await GroupApi.registry();
    const provider = reg.managed();
    let group = await provider.findByName(DORMS_GROUP);
    if (!group) {
      group = new Group();
      group.name = DORMS_GROUP;
      group.owner = 'system';
      await group.save();
    }
    if (group.addMember(path, 'member')) {
      await group.save();
      if (group._id) provider.fireChange(group._id);
    }
  }
}
