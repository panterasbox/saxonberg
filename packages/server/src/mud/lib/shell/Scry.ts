/**
 * ScryMixin — at-a-distance perception verbs (`scry`, `locate`) on
 * `ShelledCharacter`.
 *
 * No state, no settings v1 — the mixin's value is the verb
 * contributions. The capability seam lives on instruments
 * (`Scryable` in `lib/perception/Scryable.ts`) rather than on the
 * actor.
 *
 * Composition: applied to `ShelledCharacter` after `AuthorMixin`.
 */

import type { MixinConstructor } from '../mixin';
import type { CommandContributions } from '../../api/command';

export interface Scry {}

export function ScryMixin<TBase extends MixinConstructor>(Base: TBase) {
  class ScryMixin extends Base implements Scry {
    static _mixinName = 'ScryMixin';

    static persistentFields: string[] = [];

    static commandContributions: CommandContributions = {
      self: ['scry.yaml', 'locate.yaml'],
      environment: [],
      inventory: [],
      peers: [],
    };
  }
  return ScryMixin;
}
