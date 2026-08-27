/**
 * Menu — a venue's offer, the concrete commons class every menu row names
 * (`class: /platform/thing/Menu`): the bar's cocktail list, the smithy's
 * slate, the cookhouse's board. The venue-neutral {@link CommerceMenu}
 * owns the offer list, `resolveOrder`, `resolveIn`, the priced-offer
 * surface and the commerce affordances (`menu`/`order`); what differs
 * between venues is the menu's *contents* — `offeredRecipes` and prices,
 * authored per row in `data:`. The *working* verbs never ride a menu:
 * they ride the instruments (the shaker, the anvil, the pot) through the
 * capability table. Content packs wave 4b collapsed the three venue
 * subclasses (the lounge's `Menu`, `SmithyMenu`, `KitchenMenu`) into this
 * one — nothing in them but the class name.
 */

import CommerceMenu from '../../lib/commerce/Menu';

export default class Menu extends CommerceMenu {}
