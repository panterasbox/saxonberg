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
 * Phase 3 Implementation:
 * Broadcasts messages using MML (Mud Markup Language) formatting.
 * Delegates to MessageApi for distribution to all sensors in the container.
 */

import type { MixinConstructor } from '../mixin-types';
import { MessageApi } from '../../api/message';

/**
 * Mixin that adds message sending capabilities.
 */
/**
 * Public shape provided by VocalMixin.
 */
export interface Vocal {
  say(text: string): void;
}

export function VocalMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class VocalMixin extends Base {
    // Mixin marker for detection by MixinApi
    static _mixinName = 'VocalMixin';

    // Command provider (Phase 5)
    static commandProvider = {
      self: ['say.yaml', 'tell.yaml'],
      environment: [],
      inventory: [],
      colocated: [],
    };

    /**
     * Say something. Broadcasts to all sensors in the same container.
     *
     * Applied to objects that can speak (e.g., Avatar/Character).
     * Delegates to MessageApi for distribution to all sensors in environment.
     *
     * Uses MML (Mud Markup Language) tags:
     * - <name> - Character names
     * - <speech> - Spoken text
     *
     * @param text - The text to say
     */
    say(text: string): void {
      // Get the speaker's full name (from NamedMixin)
      const fullName = 'fullName' in this ? (this as any).fullName : 'Someone';

      // Create MML-formatted message
      const message = {
        type: 'output',
        payload: {
          text: `<name>${fullName}</name> says, <speech>"${text}"</speech>`,
        },
      };

      // Delegate to API layer for message distribution
      MessageApi.messageContainer(this, message);
    }
  };
}

