/**
 * SmithyMenu — the Hearthworks smithy's offer: the venue subclass of
 * {@link CommerceMenu} carrying the smithing verb surface. `order` routes
 * to the on-shift smith (the served path); `forge` is the earned one-shot
 * (deed-gated); the by-hand step verbs (`heat`/`hammer`/`quench`) and the
 * maintenance verbs (`repair`/`salvage`) join the surface with their
 * phases of the crafting-branches build.
 */

import CommerceMenu from '../../lib/commerce/Menu';
import type { CommandContributions } from '../../api/command';

export default class SmithyMenu extends CommerceMenu {
  static commandContributions: CommandContributions = {
    self: [],
    environment: [
      'crafting/menu.yaml',
      'crafting/order.yaml',
      'crafting/forge.yaml',
      'crafting/heat.yaml',
      'crafting/hammer.yaml',
      'crafting/quench.yaml',
      'crafting/repair.yaml',
      'crafting/salvage.yaml',
      'crafting/make.yaml',
    ],
    inventory: [
      'crafting/menu.yaml',
      'crafting/order.yaml',
      'crafting/forge.yaml',
      'crafting/heat.yaml',
      'crafting/hammer.yaml',
      'crafting/quench.yaml',
      'crafting/repair.yaml',
      'crafting/salvage.yaml',
      'crafting/make.yaml',
    ],
    peers: [],
  };
}
