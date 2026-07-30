/**
 * Menu — the bar's menu: the lounge subclass of the venue-neutral
 * {@link CommerceMenu} (which owns the offer list, `resolveOrder`,
 * `resolveIn`, the priced-offer surface, and the commerce affordances —
 * `menu`/`order`). The bar's *working* verbs (`pour`/`stir`/`strain`/
 * `garnish`/`serve`/`mix`) ride the shaker (`CocktailShaker`), not the
 * menu — the menu is for ordering, not making. Stays at this template
 * path so the lounge seed's `class: /domain/lounge/Menu` and bar parity
 * are untouched.
 */

import CommerceMenu from '../../lib/commerce/Menu';

export default class Menu extends CommerceMenu {}
