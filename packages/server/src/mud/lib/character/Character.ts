/**
 * Character - Abstract base class for all sentient beings (PCs and NPCs)
 *
 * This abstract class provides a common structure for player characters (PCs)
 * and non-player characters (NPCs), enforcing consistent interface while allowing
 * different implementations for progression logic.
 *
 * Composition: CommandGiver + Mobile + Container + Containable + Visible + Vocal + Sensor + Gendered + Named + Agent
 *
 * Commands are inherited from mixins and subclasses:
 * - ContainerMixin provides: inventory, get, drop
 * - PerceiverMixin provides: look / scry / locate
 * - Avatar provides: ping, help, player (diagnostic commands)
 *
 * Key Design Points:
 * - NO stat fields in Character itself (xp, level are PC-specific, deferred)
 * - honorific/name/surname/suffix/alternateNames/fullName come from NamedMixin
 * - pronouns come from GenderedMixin
 * - shortDescription/longDescription come from VisibleMixin
 * - inventory management from ContainerMixin
 * - Message capabilities from Sensor/Vocal mixins
 * - Movement capability from MobileMixin (traverse(), teleport())
 * - Container placement from ContainableMixin (setContainer/getContainer)
 * - Command execution from CommandGiverMixin (executeCommand, getAvailableCommands)
 *
 * Runtime-only class (no MongoDB collection).
 */

import { Agent } from '../stuff/Agent';
import { NamedMixin } from '../description/Named';
import { GenderedMixin } from './Gendered';
import { ContainableMixin } from '../spatial/Containable';
import { ContainerMixin } from '../spatial/Container';
import { VisibleMixin } from '../description/Visible';
import { MobileMixin } from '../spatial/Mobile';
import { SensorMixin } from '../message/Sensor';
import { PerceiverMixin } from '../description/Perceiver';
import { PerceptionMixin } from '../perception/Perception';
import { VocalMixin } from '../message/Vocal';
import { CommandGiverMixin } from '../command/CommandGiver';
import { OrganismMixin } from '../species/Organism';
import { PosedMixin } from './Posed';

// Compose mixins:
//   CommandGiver + Mobile + Container + Containable + Visible +
//   Vocal + Perception + Perceiver + Sensor + Gendered + Organism +
//   Named + Agent
// Order matters: ContainableMixin before MobileMixin (MobileMixin uses setContainer/getContainer)
// Verbs come from mixins:
//   - ContainerMixin → inventory / get / drop
//   - PerceiverMixin → look / scry / locate (actor-side, on `self`)
// VisibleMixin is target-shape only — description state, no verbs.
// Sensor + Perception together = the full perceiver substrate:
// Sensor handles channel-side message receipt, Perception handles
// the subjective interpretation seams that LightApi (and future
// hearing/etc.) ask the viewer to modulate. PerceiverMixin sits
// directly above Sensor (it requires Sensor for output routing)
// and owns the perception verb surface as a separate role from
// Sensor's "I receive scene output."
// OrganismMixin sits between NamedMixin and GenderedMixin in the
// composition chain — the slot puts a species/age/lifecycle surface
// alongside basic identity, before the gender / sensory / perception
// layers stack on top. See race.md for the rationale.
const CharacterBase = CommandGiverMixin(
  MobileMixin(
    ContainerMixin(
      ContainableMixin(
        VisibleMixin(
          VocalMixin(
            PerceptionMixin(
              PerceiverMixin(
                SensorMixin(
                  GenderedMixin(PosedMixin(OrganismMixin(NamedMixin(Agent))))
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
