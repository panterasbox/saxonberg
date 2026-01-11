/**
 * Idea - Abstract base class for conceptual objects
 *
 * In the Standard Model hierarchy:
 * - Stuff (base) - runtime objects with IDs
 * - Idea (abstract) - conceptual objects (users, players, locations, items)
 * - Agent/Thing/Location - concrete specializations
 *
 * Idea represents objects that have identity and state but aren't necessarily
 * physical. This includes users, players, NPCs, and will later include items
 * and locations.
 */

import { Stuff } from './Stuff.js';

/**
 * Abstract base class for conceptual game objects.
 * All persistent objects (User, Player, Location, etc.) extend Idea.
 */
export abstract class Idea extends Stuff {
  /**
   * Constructor - calls parent Stuff constructor.
   */
  constructor() {
    super();
  }

  /**
   * Get a string representation of this idea (for debugging).
   * Subclasses should override to provide more specific information.
   */
  public toString(): string {
    return `[Idea ${this.stuffId}${this.isDestroyed() ? ' (destroyed)' : ''}]`;
  }
}
