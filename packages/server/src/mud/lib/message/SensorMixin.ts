/**
 * SensorMixin - Message receiving/interception for sentient beings
 *
 * Provides:
 * - onMessage(message): void
 *
 * Usage:
 * ```typescript
 * class MyClass extends SensorMixin(BaseClass) {
 *   // ...
 * }
 * ```
 *
 * Phase 3 Implementation:
 * Provides a hook for objects to be notified when messages are sent to their container.
 * MessageApi handles the actual routing to clients.
 */

import type { MixinConstructor } from '../mixins/types.js';

/**
 * Mixin that adds message receiving capabilities.
 */
export function SensorMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class SensorMixin extends Base {
    // Mixin marker for detection by MixinApi
    static _mixinName = 'SensorMixin';

    /**
     * Notification hook called when a message is sent to this sensor's container.
     *
     * Default implementation does nothing.
     * Subclasses can override to add custom processing (logging, filtering, etc.).
     *
     * MessageApi handles the actual delivery to connected clients.
     *
     * @param message - The message being sent (typically WebSocketMessage)
     */
    onMessage(message: unknown): void {
      // Default: no-op
      // MessageApi handles socket delivery to connected Interactives
      // Subclasses can override for custom processing
    }
  };
}

