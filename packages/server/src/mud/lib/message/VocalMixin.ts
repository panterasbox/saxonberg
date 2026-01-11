/**
 * VocalMixin - Message sending/broadcasting for sentient beings
 *
 * Provides:
 * - say(text): void
 *
 * Usage:
 * ```typescript
 * class MyClass extends VocalMixin(BaseClass) {
 *   // ...
 * }
 * ```
 *
 * NOTE: This is a STUB implementation for Phase 2.
 * Full implementation will be done in Phase 3 when we implement the message system.
 */

import type { MixinConstructor } from '../mixins/types.js';

/**
 * Mixin that adds message sending capabilities (STUB).
 * To be fully implemented in Phase 3.
 */
export function VocalMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class VocalMixin extends Base {
    /**
     * Say something (stub).
     * To be implemented in Phase 3.
     * @param text - The text to say
     */
    say(text: string): void {
      // Stub - implement in Phase 3
      // Will need fullName from NamedMixin in the future
      console.log(`[STUB] ${text}`);
    }
  };
}
