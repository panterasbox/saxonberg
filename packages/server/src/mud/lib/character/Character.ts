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
 * - VisibleMixin provides: look
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
import { VocalMixin } from '../message/Vocal';
import { CommandGiverMixin } from '../command/CommandGiver';

// Compose mixins: CommandGiver + Mobile + Container + Containable + Visible + Vocal + Sensor + Gendered + Named + Agent
// Order matters: ContainableMixin before MobileMixin (MobileMixin uses setContainer/getContainer)
// Commands are provided by mixins (ContainerMixin provides inventory/get/drop, VisibleMixin provides look)
const CharacterBase = CommandGiverMixin(
  MobileMixin(
    ContainerMixin(
      ContainableMixin(
        VisibleMixin(VocalMixin(SensorMixin(GenderedMixin(NamedMixin(Agent)))))
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
