/**
 * SaltingTrough — the stone trough you pack meat down in salt in, and the
 * thing that affords `cure`.
 *
 * ⭐ The fixture provides DISCOVERABILITY; the **salt** provides
 * capability. `CureController` draws its salt from any reachable sack, so
 * a trough with no salt near it declines in the ordinary way ("there isn't
 * enough salt to make that") rather than hiding the verb — *afford
 * statically, decline diegetically*.
 *
 * ⚠ `peers`, and fixed in place: a stone trough is joinery, not a good you
 * pocket.
  *
 * ⭐ **A `Station`, not a `Fitting`** (the base-class narrowing): a
 * `Fitting` is furniture the general store SELLS, so it is chattel; this
 * is built into the premises and is not. See `platform/thing/Station.ts`
 * for the conflation the narrowing found.
*/

import Station from '@saxonberg/server/mud/platform/thing/Station';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';

export default class SaltingTrough extends Station {
  static commandContributions: CommandContributions = {
    peers: ['trade/cooking/cmd/crafting/cure.yaml'],
  };
}
