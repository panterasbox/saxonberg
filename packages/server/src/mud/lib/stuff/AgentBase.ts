/**
 * AgentBase - Concrete base class for Agent + mixin composition
 *
 * Since Agent is abstract (extends abstract Idea), we need a concrete
 * base class for use with TypeScript mixin composition.
 *
 * This is the same pattern as IdeaBase for Player.
 */

import { Agent } from './Agent';

/**
 * Concrete Agent base class for mixin composition.
 */
export class AgentBase extends Agent {
  constructor() {
    super();
  }
}
