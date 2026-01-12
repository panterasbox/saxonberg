/**
 * Character - Abstract base class for all sentient beings (PCs and NPCs)
 *
 * This abstract class provides a common structure for player characters (PCs)
 * and non-player characters (NPCs), enforcing consistent interface while allowing
 * different implementations for progression logic.
 *
 * Composition: MobileMixin + ContainableMixin + VocalMixin + SensorMixin + MortalMixin + GenderedMixin + NamedMixin + Agent
 *
 * Key Design Points:
 * - NO stat fields in Character itself (xp, level are PC-specific, deferred)
 * - hp/maxHp come from MortalMixin
 * - firstName/lastName/fullName come from NamedMixin
 * - pronouns come from GenderedMixin
 * - Message capabilities from Sensor/Vocal mixins
 * - Movement capability from MobileMixin (move())
 * - Container placement from ContainableMixin (setEnvironment/getEnvironment)
 *
 * Runtime-only class (no MongoDB collection).
 */

import { Agent } from './Agent';
import { NamedMixin } from '../mixins/NamedMixin';
import { GenderedMixin } from '../mixins/GenderedMixin';
import { MortalMixin } from '../mixins/MortalMixin';
import { ContainableMixin } from '../mixins/ContainableMixin';
import { MobileMixin } from '../mixins/MobileMixin';
import { SensorMixin } from '../message/SensorMixin';
import { VocalMixin } from '../message/VocalMixin';

// Compose mixins: Mobile + Containable + Vocal + Sensor + Mortal + Gendered + Named + Agent
// Order matters: ContainableMixin before MobileMixin (MobileMixin uses setEnvironment/getEnvironment)
const CharacterBase = MobileMixin(
  ContainableMixin(VocalMixin(SensorMixin(MortalMixin(GenderedMixin(NamedMixin(Agent))))))
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
