/**
 * Agent - Runtime active object base class
 *
 * Agents are runtime objects that represent active presences in the game world.
 * Unlike Idea (which can be either runtime or persistent), Agent is explicitly
 * for runtime-only objects that exist during active sessions.
 *
 * Examples:
 * - Avatar (player's active presence)
 * - NPC agents (future)
 * - Active daemons (future)
 *
 * Persistence: NOT persisted - runtime only
 */

import { Idea } from './Idea';

/**
 * Agent - Base class for runtime active objects.
 */
export abstract class Agent extends Idea {
  /**
   * Constructor.
   * Subclasses should call super() and then register with StuffApi.
   */
  constructor() {
    super();
  }

  /**
   * Cleanup hook for agents.
   * Override this in subclasses to add cleanup logic.
   * DO NOT override destroy() - use prepareDestroy() instead.
   */
  protected prepareDestroy(): void {
    // Default: no-op
    // Subclasses can override for agent-specific cleanup
  }
}
