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
 */

import Surface from '@saxonberg/server/mud/platform/thing/Surface';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';

export default class SaltingTrough extends Surface {
  static commandContributions: CommandContributions = {
    peers: ['trade/cooking/cmd/crafting/cure.yaml'],
  };
}
