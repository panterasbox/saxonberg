/**
 * DryingRack — the frame of hooks and slats you hang meat on to dry, and
 * the thing that affords `dry`. A clothes line is the same thing in the
 * yard (cleanliness D11): a row over this class.
 *
 * ⭐ Moved from `trade-cooking` to the platform with its verb (cleanliness
 * D11): the class that affords a platform verb belongs with the verb, and
 * a commons `clothes-line` row may not name a trade pack's class.
 *
 * ⭐ Drying is the hurdle that costs nothing but time — no salt, no fire —
 * so the rack is the whole apparatus, and the verb needs nothing else in
 * reach.
 *
 * ⚠ It affords `dry` and **not** `smoke`, even though you hang meat for
 * both. A rack in the open air dries; a rack in a chimney smokes; the
 * chimney is the difference and it has its own class. Folding both onto
 * one fixture is how a class name stops predicting its own surface.
 */

import Fitting from './Fitting';
import type { CommandContributions } from '../../api/command';

export default class DryingRack extends Fitting {
  static commandContributions: CommandContributions = {
    peers: ['platform/cmd/crafting/dry.yaml'],
  };
}
