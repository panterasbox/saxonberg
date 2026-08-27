/**
 * SmithyMenu — the Hearthworks smithy's offer: the venue subclass of
 * {@link CommerceMenu} (which owns the commerce affordances —
 * `menu`/`order`). The smithing *working* verbs ride the instruments,
 * not the menu: the anvil (an `anvil`-capability ToolItem) confers `hammer`/`quench`/
 * `forge` + `repair`/`salvage`, the furnace confers `heat` (with
 * `ignite`/`douse`/`pump`), the carried whetstone confers `sharpen`.
 * Stays at this template path for the smithy seed's `class:` reference.
 */

import CommerceMenu from '../../lib/commerce/Menu';

export default class SmithyMenu extends CommerceMenu {}
