/**
 * Character - Abstract base class for all sentient beings (PCs and NPCs)
 *
 * This abstract class provides a common structure for player characters (PCs)
 * and non-player characters (NPCs), enforcing consistent interface while allowing
 * different implementations for progression logic.
 *
 * Composition: NamedMixin + GenderedMixin + MortalMixin + SensorMixin + VocalMixin + Agent
 *
 * Key Design Points:
 * - NO stat fields in Character itself (xp, level are PC-specific, deferred)
 * - hp/maxHp come from MortalMixin
 * - firstName/lastName/fullName come from NamedMixin
 * - pronouns come from GenderedMixin
 * - Message capabilities from Sensor/Vocal mixins (stubs for Phase 2)
 *
 * Runtime-only class (no MongoDB collection).
 */

import { Agent } from './Agent.js';
import { NamedMixin } from '../mixins/NamedMixin.js';
import { GenderedMixin } from '../mixins/GenderedMixin.js';
import { MortalMixin } from '../mixins/MortalMixin.js';
import { SensorMixin } from '../message/SensorMixin.js';
import { VocalMixin } from '../message/VocalMixin.js';

// Compose mixins: Named + Gendered + Mortal + Sensor + Vocal + Agent
const CharacterBase = VocalMixin(SensorMixin(MortalMixin(GenderedMixin(NamedMixin(Agent)))));

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
