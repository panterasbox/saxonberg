/**
 * Character - Abstract base class for all sentient beings (PCs and NPCs)
 *
 * The **agency** layer on top of `Creature` (the body layer). A
 * Character is a Creature that can act: execute commands, perceive,
 * speak, move, engage, and carry a narrative/social identity. The
 * body itself — identity, species/lifecycle, sex, anatomy slots,
 * posture, description, containment, vitals, reserves — lives on
 * `Creature` (`lib/creature/Creature.ts`).
 *
 * Composition (agency, inner→outer on `Creature`):
 *   BeliefStore + Persona + Gendered + Sensor + Perceiver + Perception +
 *   Vocal + Soul + Engaged + Hauler + Mobile + CommandGiver
 *
 * Commands are inherited from mixins and subclasses:
 * - ContainerMixin (on Creature) provides: inventory, get, drop
 * - PerceiverMixin provides: look / scry / locate
 * - Avatar provides: ping, help, player (diagnostic commands)
 *
 * Key Design Points:
 * - NO stat fields in Character itself (xp, level are PC-specific, deferred)
 * - honorific/name/surname/suffix/alternateNames/fullName come from NamedMixin (Creature)
 * - pronouns come from GenderedMixin (social presentation — Character-tier)
 * - shortDescription/longDescription come from VisibleMixin (Creature)
 * - inventory management from ContainerMixin (Creature)
 * - Message capabilities from Sensor/Vocal mixins
 * - Movement capability from MobileMixin (traverse(), teleport())
 * - Container placement from ContainableMixin (Creature)
 * - Command execution from CommandGiverMixin (executeCommand, getAvailableCommands)
 *
 * Runtime-only class (no MongoDB collection).
 */

import { Creature } from '../creature/Creature';
import { GenderedMixin } from './Gendered';
import { PersonaMixin } from './Persona';
import { MobileMixin } from '../spatial/Mobile';
import { HaulerMixin } from '../slot/Hauler';
import { SensorMixin } from '../message/Sensor';
import { PerceiverMixin } from '../description/Perceiver';
import { PerceptionMixin } from '../perception/Perception';
import { VocalMixin } from '../message/Vocal';
import { SoulMixin } from '../social/Soul';
import { CommandGiverMixin } from '../command/CommandGiver';
import { AdvancementMixin } from '../advancement/Advancement';
import { EngagedMixin } from '../activity/Engaged';
import { CasterMixin } from '../magic/Caster';
import { BeliefStoreMixin } from '../belief/BeliefStore';
import { StatusMixin } from '../status/Status';
import { EmployedMixin } from '../employment/Employed';
import { CombatantMixin } from '../combat/Combatant';
import { HidingMixin } from '../concealment/Hiding';

// Compose the agency mixins on top of the Creature body layer.
// Order matters:
// - PerceiverMixin sits directly above SensorMixin (it requires
//   Sensor for output routing) and owns the perception verb surface
//   as a separate role from Sensor's "I receive scene output."
//   Sensor + Perception together = the full perceiver substrate.
// - HaulerMixin sits between Mobile and Engaged. Position is free (it
//   only holds the hitched-cart live ref); placing it on Character gives
//   every PC and NPC-character the ability to pull a cart, while keeping
//   it off the broad Creature base (a frog / corpse never hauls).
//   LoadBearing (on Creature) reads its draft term dynamically via
//   MixinApi.isHauling, so stack position doesn't matter.
// - EngagedMixin sits immediately below MobileMixin so the body-slot
//   engagement (source of truth for `Mobile.getEngagedMode`) can be
//   read without forward references. Engagement is orthogonal to
//   mobility — a stationary forge-bound creature is Engaged but not
//   Mobile — but co-composing on Character gets both surfaces on
//   every PC and NPC in one shot.
// - ContainableMixin (on Creature) is inner of MobileMixin (which
//   uses setContainer/getContainer) — preserved inner→outer across
//   the body/agency boundary.
// - PersonaMixin + GenderedMixin (narrative + social identity) sit
//   innermost on the agency stack, above the Creature body.
// - BeliefStoreMixin (per-viewer identity memory) sits innermost of
//   all — it reads nothing from the other mixins, so position is free;
//   placing it at the base of the agency stack keeps every PC and NPC
//   (the viewer types) carrying it.
// - AdvancementMixin sits OUTERMOST, above CommandGiverMixin: it pushes
//   competence-conferred verbs onto the giver's affordance stack, so it
//   needs CommandGiver's surface (pushCommandSource/popCommandSource) in
//   its base.
const CharacterBase = AdvancementMixin(
  CombatantMixin(
  CommandGiverMixin(
  MobileMixin(
    HaulerMixin(
    EngagedMixin(
      CasterMixin(
      SoulMixin(
        VocalMixin(
          PerceptionMixin(
            PerceiverMixin(
              SensorMixin(
                GenderedMixin(
                  PersonaMixin(
                    StatusMixin(
                    BeliefStoreMixin(HidingMixin(EmployedMixin(Creature)))
                  )
                  )
                )
              )
            )
          )
        )
      )
      )
    )
    )
  )
  )
  )
);

/**
 * Character abstract class - base for all sentient beings.
 *
 * Type checking should use TypeScript's type system:
 * - `avatar instanceof Avatar` - check if player character
 * - `avatar instanceof Creature` - check if it has a body
 * - `npc instanceof NPC` - check if NPC (when we implement NPCs)
 */
export abstract class Character extends CharacterBase {
  /**
   * Constructor.
   * Subclasses should call super() and then initialize.
   */
  constructor() {
    super();
  }
}
