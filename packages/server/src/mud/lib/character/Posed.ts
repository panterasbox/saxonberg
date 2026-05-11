/**
 * PosedMixin — actor-side posture state. Composed by `Character` so
 * every PC and NPC carries `getPosture()` / `setPosture()` uniformly.
 *
 * The host-side counterpart is `PosturedMixin` (`lib/slot/Postured`):
 * a chair / bed / floor exposes posture-bearing slots, and an actor
 * sitting in one of them flips to the matching `Postures.*` value.
 *
 * Storage: a direct string field — posture is intrinsic per-actor
 * runtime state, persistent across saves so reconnects restore the
 * posture an avatar logged off in. Default `Postures.Stand`.
 *
 * The `Postures` constants live in `lib/slot/Postured.ts` (the
 * host-side mixin owns the vocabulary). Verbs and validators import
 * from there.
 */

import type { MixinConstructor } from '../mixin';
import { Postures } from '../slot/Postured';

export interface Posed {
  getPosture(): string;
  setPosture(value: string): void;
}

export function PosedMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class PosedMixin extends Base {
    static _mixinName = 'PosedMixin';
    static persistentFields = ['posture'];

    public posture: string = Postures.Stand;

    public getPosture(): string {
      return this.posture;
    }

    public setPosture(value: string): void {
      this.posture = value;
    }
  };
}
