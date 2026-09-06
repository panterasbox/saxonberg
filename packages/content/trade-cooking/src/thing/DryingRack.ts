/**
 * DryingRack — the frame of hooks and slats you hang meat on to dry, and
 * the thing that affords `dry`.
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

import Surface from '@saxonberg/server/mud/platform/thing/Surface';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';

export default class DryingRack extends Surface {
  static commandContributions: CommandContributions = {
    peers: ['trade/cooking/cmd/crafting/dry.yaml'],
  };
}
