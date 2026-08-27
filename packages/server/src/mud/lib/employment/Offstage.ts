/**
 * OffstageMixin — the off-shift parking role for a Location: where a
 * venue's cast goes when it is fully OFF (outside its scheduled hours).
 *
 * The `shifts` brain relocates an off-duty NPC rather than destroying and
 * respawning it (the world conserves identity), so every venue with a
 * scheduled cast needs somewhere for that cast to *be*. This mixin is that
 * role: a holding room with no player-reachable exits, out of play,
 * materialized on demand (`StuffApi.singletonOrClone`) the first time a
 * shift ends. Players never see it; the description is what an operator
 * reads if they teleport in.
 *
 * It is a marker plus the one invariant of the role — an offstage room is
 * never `Exitable` — so the brain, the employment tests and any audit can
 * ask `MixinApi.isOffstage(room)` rather than trust a path. Substrate in
 * `lib/employment` (content packs wave 4b graduated it out of the lounge):
 * the concrete clonable is `platform/location/Offstage`, which every
 * venue's `offstage` row names; each venue's row is its own singleton.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';

/** Public shape added by OffstageMixin. */
export interface Offstage {
  /** The role, as a predicate: this room parks off-shift cast. */
  isOffstage(): boolean;
}

export function OffstageMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase
) {
  return class OffstageMixin extends Base {
    static _mixinName = 'OffstageMixin';
    static fieldMeta: FieldMeta = {};

    isOffstage(): boolean {
      return true;
    }
  };
}
