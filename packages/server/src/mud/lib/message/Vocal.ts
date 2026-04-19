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
import type { Stuff } from '../stuff/Stuff';
import { MessageApi } from '../../api/message';
import { MixinApi } from '../../api/mixin';
import { DescribeApi } from '../../api/describe';

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
     * Say something. Broadcasts to all sensors in the speaker's scope.
     *
     * Scope is inferred from what the speaker is:
     * - A Containable speaker (Character in a room) addresses its peers —
     *   every sensor in the speaker's environment, including itself.
     * - A pure-Container speaker (a haunted room talking to its occupants)
     *   addresses its own contents.
     * - A speaker that is both (rare — a walking house) defers to the
     *   peers-mode Containable path; "say" semantically targets equals.
     *
     * Throws at runtime if the composer omitted both mixins — Vocal has
     * nowhere to broadcast otherwise. This is a composition error, not a
     * user-input error.
     *
     * Uses MML (Mud Markup Language) tags:
     * - <name> - Speaker name
     * - <speech> - Spoken text
     *
     * @param text - The text to say
     */
    say(text: string): void {
      const self = this as unknown as Stuff;
      const fullName = DescribeApi.getDisplayName(self, 'Someone');

      const message = {
        type: 'output',
        payload: {
          text: `<name>${fullName}</name> says, <speech>"${text}"</speech>`,
        },
      };

      if (MixinApi.isContainable(self)) {
        MessageApi.messageContainer(self, message);
      } else if (MixinApi.isContainer(self)) {
        MessageApi.messageContents(self, message);
      } else {
        throw new Error(
          'VocalMixin requires composition with Container or Containable'
        );
      }
    }
  };
}

