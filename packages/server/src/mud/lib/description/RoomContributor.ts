/**
 * RoomContributorMixin — a thing in a room that adds a line to the ROOM's
 * prose.
 *
 * `look` describes a place from the place's own authored text, and until
 * the maritime build nothing it held could add to that: a river edge's
 * water read appeared only on `look <the edge>`, and a headland overlooking
 * a bay had to repeat the bay in its own description. This mixin is the
 * one seam by which contents speak in the room's voice.
 *
 * It is kernel because the reader (`LookController`) is kernel and one
 * composer, the water pack's `Shore`, is a pack class: the hook has to be
 * declared where both can see it. Three implementers ship — `Shore`, its
 * moving twin `Gunwale`, and `Vantage` — so it is a hook, not a costume.
 *
 * ⛔ Narrow with `MixinApi.isRoomContributor`, never by sniffing for a
 * method of the right name.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';

export interface RoomContributor {
  contributeToRoom(viewer: Stuff): Promise<string | null> | string | null;
}

export function RoomContributorMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class RoomContributorMixin extends Base implements RoomContributor {
    static _mixinName: string = 'RoomContributorMixin';

    /**
     * The line this thing adds to its room's description for `viewer`, or
     * `null` for nothing.
     *
     * @hook Invoked by `look` on a location, once per contributing item
     *   among the room's perceivable contents, after the room's own
     *   description and its landmarks. Return plain markup — one sentence
     *   or two, in the room's voice — or `null`. Never throw: a failing
     *   contributor must not take `look` down (the caller swallows, but a
     *   lost line is a silent one).
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    contributeToRoom(_viewer: Stuff): Promise<string | null> | string | null {
      return null;
    }
  };
}
