/**
 * ColdRoom — ⭐ **a walk-in cold room: the Location half of the Thing≡Location
 * proof.** It composes the SAME `ClimateControlMixin` the `ColdStore` Thing
 * does, over a `Location` instead of a `Good`, and gets the same behaviour:
 * its air is driven toward a setpoint while the premises' meter is live, and
 * drifts when cut. A thing standing in it reads its cold by the same
 * `airScopeOf` a thing in a fridge does — one mixin, one outcome.
 *
 * A `Location` already answers everything the coach's four overrides add to a
 * Thing: it has a volume (its cell extent), a sky rule (its biome), exits, and
 * an `enclosure:`. So the Location half adds NOTHING but the composition —
 * which is the whole point. It is metered against ITSELF (a Location is not
 * Containable; `GridPoweredMixin.resolveRoomPath` returns its own path).
 *
 * The forestry `Wood` precedent: a pack class extending the platform's
 * `SingletonCartesianLocation`. See [docs/subsystems/energy.md],
 * [docs/subsystems/thermal.md § The active twin].
 */

import SingletonCartesianLocation from '@saxonberg/server/mud/platform/location/SingletonCartesianLocation';
import { ClimateControlMixin } from '@saxonberg/server/mud/lib/thermal/ClimateControl';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { MarkupAugmenter } from '@saxonberg/server/mud/api/mml';
import { GridPoweredMixin } from '../lib/GridPowered';

const ColdRoomBase = ClimateControlMixin(
  GridPoweredMixin(SingletonCartesianLocation),
);

export default class ColdRoom extends ColdRoomBase {
  static markupAugmenters: MarkupAugmenter[] = [coldRoomStateAugmenter];

  /** The live state sentence, read off the room. */
  public stateLine(): string {
    return this.isPowered()
      ? 'The compressor hums; the air is cold and still.'
      : 'The compressor is silent, and the air is warming.';
  }
}

/** Append the cold room's live state to its `look` long description. */
function coldRoomStateAugmenter(
  text: string,
  host: Stuff,
  _viewer: Stuff,
): string {
  if (!(host instanceof ColdRoom)) return text;
  const line = host.stateLine();
  return text && text.length > 0 ? `${text}\n\n${line}` : line;
}
