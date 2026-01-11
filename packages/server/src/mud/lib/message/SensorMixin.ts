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
 * NOTE: This is a STUB implementation for Phase 2.
 * Full implementation will be done in Phase 3 when we implement the message system.
 */

import type { MixinConstructor } from '../mixins/types.js';

/**
 * Mixin that adds message receiving capabilities (STUB).
 * To be fully implemented in Phase 3.
 */
export function SensorMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class SensorMixin extends Base {
    /**
     * Receive a message (stub).
     * To be implemented in Phase 3.
     * @param message - The message to receive
     */
    onMessage(message: any): void {
      // Stub - implement in Phase 3
      console.log('Message received:', message);
    }
  };
}
