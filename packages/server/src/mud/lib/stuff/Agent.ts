/**
 * Agent - Runtime active object base class
 *
 * Agents are runtime objects that represent active presences in the game
 * world. Unlike Idea (abstract, non-material, non-spatial — Users, Players,
 * Interactives), Agent sits directly on Stuff and is explicitly for
 * runtime-only, potentially embodied actors.
 *
 * Examples:
 * - Character (and its subclasses, e.g. Avatar)
 * - NPC agents (future)
 * - Active daemons (future)
 *
 * Persistence: NOT persisted - runtime only
 */

import { Stuff } from './Stuff';

export class Agent extends Stuff {
  constructor() {
    super();
  }

  protected prepareDestroy(): void {
    // Default: no-op
    // Subclasses can override for agent-specific cleanup
  }
}

Stuff._registerTopLevelBranch(Agent);
