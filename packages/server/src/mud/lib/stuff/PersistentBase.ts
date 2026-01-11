/**
 * PersistentBase - Concrete base class for Persistent + mixin composition
 *
 * Since Persistent extends abstract Idea, we need a concrete base class
 * for use with TypeScript mixin composition.
 *
 * This is the same pattern as IdeaBase and AgentBase.
 */

import { Persistent } from './Persistent.js';

/**
 * Concrete Persistent base class for mixin composition.
 */
export class PersistentBase extends Persistent {
  constructor() {
    super();
  }
}
