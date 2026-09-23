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
 *   - She holds the `hall-manager` POSITION at the college
 *     (`duncan-hall/idea/college`, an Organization whose appointing
 *     authority is the hall's committee) — authored on its roster, so
 *     `provision`/`unprovision` authorize her as staff. She is NOT a member
 *     of the `duncan-hall` group that holds the title: a committee is
 *     players only, and an NPC on one is doctrine 2 broken (economic
 *     bootstrap D8). A job, never a seat; conferred, never self-claimed.
 *   - Her master ring (legitimate master access to every pin-tumbler dorm
 *     lock) is a physical `Key` `props:`-seeded into her inventory from
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

import NPC from '@saxonberg/server/mud/lib/npc/NPC';
import { CastMixin } from '@saxonberg/server/mud/lib/npc/Cast';
import { PopulatesMixin } from '@saxonberg/server/mud/lib/stuff/Populates';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';

export default class Katie extends CastMixin(PopulatesMixin(NPC)) {
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
    peers: [
      'world/terminus/eternal/duncan-hall/cmd/provision.yaml',
      'world/terminus/eternal/duncan-hall/cmd/unprovision.yaml',
    ],
    environment: [],
  };
}
