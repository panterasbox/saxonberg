/**
 * ApplicationInstance - Singleton accessor for Application
 *
 * This provides a simple way for the Mudlib layer (API classes, game objects)
 * to access the Application singleton without circular dependencies.
 *
 * Usage:
 * ```typescript
 * const app = ApplicationInstance.get();
 * ```
 */

import { Application } from './Application.js';

/**
 * Singleton accessor for Application.
 */
export class ApplicationInstance {
  /**
   * Get the Application singleton.
   *
   * @returns Application instance
   */
  public static get(): Application {
    return Application.get();
  }
}
