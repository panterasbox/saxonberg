/**
 * KitchenMenu — the Hearthworks cookhouse's offer: the venue subclass of
 * {@link CommerceMenu} carrying the cooking verb surface. `order` routes
 * to the on-shift cook; `cook` is the earned one-shot (deed-gated); the
 * by-hand path rides the bar's vessel verbs (`pour`-as-`add` / `stir`)
 * plus the cooking steps (`heat`/`plate`) that join with their phase of
 * the crafting-branches build.
 */

import CommerceMenu from '../../lib/commerce/Menu';
import type { CommandContributions } from '../../api/command';

export default class KitchenMenu extends CommerceMenu {
  static commandContributions: CommandContributions = {
    self: [],
    environment: [
      'crafting/menu.yaml',
      'crafting/order.yaml',
      'crafting/cook.yaml',
      'crafting/pour.yaml',
      'crafting/stir.yaml',
      'crafting/make.yaml',
    ],
    inventory: [
      'crafting/menu.yaml',
      'crafting/order.yaml',
      'crafting/cook.yaml',
      'crafting/pour.yaml',
      'crafting/stir.yaml',
      'crafting/make.yaml',
    ],
    peers: [],
  };
}
