/**
 * Katie — Duncan Hall's live-in property manager (the housing-intake slice).
 *
 * A troll super who greets every new tenant on day one and finds them a room
 * — her clipboard IS the dorm manifest (the `DormWarren`), so when she "finds
 * you a room" the building buds a node. She fronts provisioning in the world
 * (`talk to Katie`), so a player never types the raw operator verb.
 *
 * She is almost entirely **content** (name + species + dispositions + an
 * intake dialogue tree in her seed). Her authority is content too, and — the
 * point — **owner-conferred, never self-claimed**:
 *
 *   - She is an *agent of the dorms owner* (so `provision`/`unprovision`
 *     authorize her) because the landlord's `duncan-hall` group lists her
 *     `templatePath` as a member — authored in `config/groups.yaml`, seeded by
 *     `GroupSeeder`. She does NOT enroll herself; a member writing its own name
 *     into the ledger is circular and no real authority.
 *   - Her master ring (legitimate master access to every pin-tumbler dorm
 *     lock) is a physical `Key` `populates`d into her inventory from
 *     `npc/master-ring.yaml` — an owner-authored spawn loadout, not a
 *     self-issued credential.
 *
 * So the class carries no bespoke authority code — only the composition needed
 * to accept a declarative loadout (`PopulatesMixin`) and the operator-verb
 * affordance (content affords its own commands). The full character (the
 * murder on-ramp, the clearing-hand, the ambient maintenance routine, the
 * code-switch enforcement beats) is deferred to the EU narrative build — see
 * `docs/staging/eternal-university/npcs/property-manager.md`.
 */

import NPC from '../../../../lib/npc/NPC';
import { PopulatesMixin } from '../../../../lib/stuff/Populates';
import type { CommandContributions } from '../../../../api/command';

export default class Katie extends PopulatesMixin(NPC) {
  /**
   * The operator escape hatch for the dorm landlord verbs. Katie IS the
   * front desk, so she affords `provision`/`unprovision` to co-located
   * operators — the raw manual surface behind the diegetic dialogue path.
   * Both views carry `requiresWizard`, so only an operator (wizard) sees
   * them; the real dorms-owner authorization lives at the controllers'
   * `execute()`. This keeps the dorm verbs' affordance in the content
   * namespace — the core `AuthorMixin` no longer references Duncan Hall.
   */
  static commandContributions: CommandContributions = {
    self: [],
    environment: [
      '/domain/eternal/duncan-hall/cmd/provision.yaml',
      '/domain/eternal/duncan-hall/cmd/unprovision.yaml',
    ],
    inventory: [],
    peers: [],
  };
}
