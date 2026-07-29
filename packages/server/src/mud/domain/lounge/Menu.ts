/**
 * Menu — the bar's menu: the lounge subclass of the venue-neutral
 * {@link CommerceMenu} (which owns the offer list, `resolveOrder`,
 * `resolveIn`, and the priced-offer surface). This class carries exactly
 * the **bar's** verb affordances — the venue-specific half `CommerceMenu`
 * deliberately doesn't own. Stays at this template path so the lounge
 * seed's `class: /domain/lounge/Menu` and bar parity are untouched.
 */

import CommerceMenu from '../../lib/commerce/Menu';
import type { CommandContributions } from '../../api/command';

export default class Menu extends CommerceMenu {
  /**
   * The bar's crafting verb surface lights up wherever its menu is present
   * (in the room, or carried). `serve`/`mix` are the atomic maker verbs
   * (maker = the giver); `order` routes to a present fulfilling maker. The
   * manual-build verbs (`pour`/`add`/`stir`/`shake`/`strain`/`garnish`)
   * are the step-by-step path — engaged activities over a build vessel.
   */
  static commandContributions: CommandContributions = {
    self: [],
    environment: [
      'crafting/menu.yaml',
      'crafting/order.yaml',
      'crafting/serve.yaml',
      'crafting/mix.yaml',
      'crafting/pour.yaml',
      'crafting/stir.yaml',
      'crafting/strain.yaml',
      'crafting/garnish.yaml',
      'crafting/make.yaml',
    ],
    inventory: [
      'crafting/menu.yaml',
      'crafting/order.yaml',
      'crafting/serve.yaml',
      'crafting/mix.yaml',
      'crafting/pour.yaml',
      'crafting/stir.yaml',
      'crafting/strain.yaml',
      'crafting/garnish.yaml',
      'crafting/make.yaml',
    ],
    peers: [],
  };
}
