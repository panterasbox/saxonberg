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
 *   Vocal + Soul + Engaged + Mobile + CommandGiver
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
import { SensorMixin } from '../message/Sensor';
import { PerceiverMixin } from '../description/Perceiver';
import { PerceptionMixin } from '../perception/Perception';
import { VocalMixin } from '../message/Vocal';
import { SoulMixin } from '../social/Soul';
import { CommandGiverMixin } from '../command/CommandGiver';
import { EngagedMixin } from '../activity/Engaged';
import { BeliefStoreMixin } from '../belief/BeliefStore';
import { StatusMixin } from '../status/Status';

// Compose the agency mixins on top of the Creature body layer.
// Order matters:
// - PerceiverMixin sits directly above SensorMixin (it requires
//   Sensor for output routing) and owns the perception verb surface
//   as a separate role from Sensor's "I receive scene output."
//   Sensor + Perception together = the full perceiver substrate.
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
const CharacterBase = CommandGiverMixin(
  MobileMixin(
    EngagedMixin(
      SoulMixin(
        VocalMixin(
          PerceptionMixin(
            PerceiverMixin(
              SensorMixin(
                GenderedMixin(
                  PersonaMixin(StatusMixin(BeliefStoreMixin(Creature)))
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
