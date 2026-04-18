/**
 * Stuff - Base class for all game objects
 *
 * This is the root of the Standard Model hierarchy. Every object in the game
 * (users, players, items, locations, etc.) is a Stuff.
 *
 * Responsibilities:
 * - Runtime ID generation (stuffId)
 * - Destruction lifecycle (isDestroyed flag)
 * - Auto-unregistration from StuffApi (on destroy)
 *
 * CRITICAL PATTERNS:
 *
 * 1. Object Creation:
 * - Use StuffApi.create(() => new YourClass()) to create objects
 * - This ensures objects are properly registered for tracking
 * - Direct 'new' calls will work but object won't be tracked
 *
 * 2. Object Destruction:
 * - Call StuffApi.destruct(obj) to destroy objects — it is the canonical
 *   destruction entry point. Direct obj.destroy() calls still work today
 *   but will eventually be locked down by the call security framework so
 *   only the Api layer can invoke them.
 * - Override prepareDestroy() in subclasses for cleanup logic.
 * - destroy() is FINAL — DO NOT override it. This ensures StuffApi.unregister()
 *   ALWAYS happens (essential for GC) and prevents memory leaks.
 */

import { nanoid } from 'nanoid';
import { StuffApi } from '../../api/stuff';

/**
 * Metadata for destroyed objects (used for debugging).
 */
export interface DestroyedObjectMetadata {
  stuffId: string;
  destroyedAt: Date;
}

/**
 * Base class for all game objects.
 */
export abstract class Stuff {
  /**
   * Runtime ID for this object (generated using nanoid).
   * This is NOT the MongoDB _id - it's a runtime identifier.
   */
  public readonly stuffId: string;

  /**
   * Flag indicating whether this object has been destroyed.
   * Once destroyed, the object should not be used.
   */
  private _isDestroyed: boolean = false;

  /**
   * Constructor - generates unique runtime ID.
   *
   * Subclass constructors should call super() and then initialize their fields.
   * Use field initializers for default values where possible.
   *
   * IMPORTANT: Objects created with 'new' are NOT automatically registered.
   * Use StuffApi.create(() => new YourClass()) to ensure registration.
   */
  constructor() {
    this.stuffId = nanoid();
  }

  /**
   * Check if this object has been destroyed.
   */
  public isDestroyed(): boolean {
    return this._isDestroyed;
  }

  /**
   * Hook for subclass cleanup logic.
   * Called by destroy() before marking object as destroyed and unregistering.
   *
   * Override this method in subclasses to add cleanup logic.
   * DO NOT call super.prepareDestroy() unless parent class needs it.
   *
   * Examples:
   * - Unlink references to other objects
   * - Close file handles
   * - Cancel timers
   * - Release resources
   */
  protected prepareDestroy(): void {
    // Default: no-op
    // Subclasses override this for cleanup
  }

  /**
   * Destroy this object (FINAL - DO NOT OVERRIDE).
   *
   * Prefer StuffApi.destruct(obj) — this method is the low-level primitive
   * it delegates to, and will eventually be locked down by call security so
   * only the Api layer can invoke it.
   *
   * This method performs critical housekeeping for garbage collection:
   * 1. Calls prepareDestroy() hook for subclass cleanup
   * 2. Marks object as destroyed
   * 3. Unregisters from StuffApi
   *
   * WARNING: DO NOT OVERRIDE THIS METHOD.
   * Override prepareDestroy() instead for cleanup logic.
   */
  public destroy(): void {
    if (this._isDestroyed) {
      console.warn(`Stuff.destroy(): Object ${this.stuffId} already destroyed`);
      return;
    }

    // Step 1: Call subclass cleanup hook
    this.prepareDestroy();

    // Step 2: Mark as destroyed (prevents double-destroy)
    this._isDestroyed = true;

    // Step 3: Critical housekeeping - unregister from StuffApi
    // This MUST happen for garbage collection to work properly
    StuffApi.unregister(this);
  }

  /**
   * Get a string representation of this object (for debugging).
   */
  public toString(): string {
    return `[Stuff ${this.stuffId}${this._isDestroyed ? ' (destroyed)' : ''}]`;
  }
}
