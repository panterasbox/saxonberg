/**
 * AetherMixin — **attunement**: this body can perceive the Aether when
 * something tunes it.
 *
 * The Aether is the in-fiction comm-network — the medium that carries
 * non-acoustic communications across distance. AetherMixin is the
 * gated sense: composed on every played body, inert until a tuner
 * confers it (an implant seated, a phone borne ready, a born-attuned
 * species), and when active it adds the ESP modalities below to the
 * sensorium — which is what reception-gating rides.
 *
 * **Perceiving ≠ hosting ≠ transmitting.** Hosting aether software (the
 * apps a thing runs) is `AetherHostMixin` (`lib/augmentation/AetherHost`,
 * split out by aether-devices D2); transmitting (`tell`, the
 * `dm`/`reply`/`broadcast`/`chat` verbs) is `CommsMixin` on the person.
 *
 * Distinct from `VocalMixin` (acoustic transport — say, whisper, shout).
 * And a LOCAL emote needs none of this: the room carries emotes
 * (aether-devices D7). Only an emote to someone elsewhere rides the
 * `emotive-esp` modality granted here.
 */

import type { MixinConstructor } from '../mixin';

/**
 * The `AetherMixin` instance surface is empty on purpose: attunement is
 * a sense, declared as the static `_grantsModalities`, and read through
 * `MixinApi.isActive(x, 'AetherMixin')` or the sensorium — never through
 * a method on the body.
 */
export type Aether = object;

export function AetherMixin<TBase extends MixinConstructor>(Base: TBase) {
  class AetherMixin extends Base {
    static _mixinName = 'AetherMixin';

    /**
     * Augment-gated marker: AetherMixin is composed natively on every
     * Avatar but is inert unless a tuner confers it.
     * `MixinApi.getActiveMixins` reflects the tuner in real time.
     */
    static _augmentGated = true;

    /**
     * Modalities AetherMixin contributes to the sensorium when active.
     * `PerceptionApi.sensorium` walks active mixins and unions their
     * `_grantsModalities`; there is no native ESP organ.
     */
    static _grantsModalities: readonly string[] = [
      'verbal-esp',
      'emotive-esp',
    ];
  }
  return AetherMixin;
}
