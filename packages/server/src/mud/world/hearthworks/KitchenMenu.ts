/**
 * KitchenMenu — the Hearthworks cookhouse's offer: the venue subclass of
 * {@link CommerceMenu} (which owns the commerce affordances —
 * `menu`/`order`). The cooking *working* verbs ride the pot
 * (`obj/CookPot` confers `pour`/`stir`/`heat`/`plate`/`cook`), not the
 * menu — reachable heat + a pot IS a kitchen, menu or no menu. Stays at
 * this template path for the cookhouse seed's `class:` reference.
 */

import CommerceMenu from '../../lib/commerce/Menu';

export default class KitchenMenu extends CommerceMenu {}
