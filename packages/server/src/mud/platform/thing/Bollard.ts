/**
 * Bollard — ⭐ **what a line is made fast round**.
 *
 * A post of iron or oak set into a quay, a ring-bolt in a rock, a pair of
 * bitts on a deck: a fixed good. A ship coming alongside makes her lines
 * fast round the bollards on the landing (`Ship.comeAlongside`, through
 * each rope's own `tieTo`), and each line's end lies beside one — a real
 * thing on the quay, so `look` sees her lines ashore and `untie` is a thing
 * a person on the quay can do. A landing with no bollard has nothing to
 * make fast to: a ship lies off it, unmoored.
 *
 * ⭐ **Her bitts are a bollard too** (`/platform/thing/bitts`), and a rope
 * kept AT them — flaked down `on` them, or tied round them — is one of
 * her mooring lines (`Ship.linesAboard`). That is the whole rule: any rope
 * row an author props `on: bitts`, or a player lays there (`put rope on
 * bitts`, `tie rope to bitts`), moors her; a rope lying loose on her deck
 * does not.
 *
 * Fixed by construction (a bollard is not carried off).
 */

import Good from './Good';
import Line from '../../lib/spatial/Line';
import { PlacingMixin } from '../../lib/spatial/Placing';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Containable } from '../../lib/spatial/Containable';
import type { VetoResult } from '../../lib/errors';

export default class Bollard extends PlacingMixin(Good) {
  constructor() {
    super();
    this.fixedInPlace = true;
  }

  /** ⭐ A line is flaked down on it, and nothing else. */
  public override canPlace(item: Stuff & Containable, name: string): VetoResult {
    if (!(item instanceof Line)) return { ok: false, reason: 'only-a-line' };
    return super.canPlace(item, name);
  }
}
