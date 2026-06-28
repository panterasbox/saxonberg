/**
 * TwitchTunedMixin — per-Avatar set of relayed Twitch channels the player
 * is tuned in to. The relay is **subscription-gated, not implant-gated**
 * (a meta/OOC surface), so tuning is the only reception gate; this is the
 * store the relay's `audienceFor` and presence-gating read.
 *
 * Stored as a string[] of `broadcasterId`s (the persistence-friendly Set
 * shape, mirroring `ContactsMixin._contacts`). Composed onto `Avatar`.
 */

import type { MixinConstructor } from '../mixin';

export interface TwitchTuned {
  /** Tune in to a broadcaster. Returns false if already tuned. */
  addTuned(broadcasterId: string): boolean;
  /** Tune out. Returns false if not tuned. */
  removeTuned(broadcasterId: string): boolean;
  isTuned(broadcasterId: string): boolean;
  getTunedIds(): readonly string[];
}

export function TwitchTunedMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class TwitchTunedMixin extends Base implements TwitchTuned {
    static _mixinName = 'TwitchTunedMixin';
    static persistentFields = ['_tunedTwitch'];

    _tunedTwitch: string[] = [];

    addTuned(broadcasterId: string): boolean {
      if (this._tunedTwitch.includes(broadcasterId)) return false;
      this._tunedTwitch.push(broadcasterId);
      return true;
    }

    removeTuned(broadcasterId: string): boolean {
      const before = this._tunedTwitch.length;
      this._tunedTwitch = this._tunedTwitch.filter(
        (id) => id !== broadcasterId
      );
      return this._tunedTwitch.length < before;
    }

    isTuned(broadcasterId: string): boolean {
      return this._tunedTwitch.includes(broadcasterId);
    }

    getTunedIds(): readonly string[] {
      return this._tunedTwitch;
    }
  };
}
