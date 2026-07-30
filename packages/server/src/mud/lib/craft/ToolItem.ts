/**
 * ToolItem — a portable tool: the capital side of control.
 *
 * `ToolMixin(DurableMixin(DetailedMixin(Thing)))` — a `Tangible` carrying
 * tool capabilities (ToolMixin) + a wear-on-use condition (DurableMixin, the
 * durable-good half). Backs the bar's shaker / mixing-glass (and any future
 * strainer / muddler); capabilities + condition are authored in each seed's
 * `data:`.
 */

import Thing from '../stuff/Thing';
import { DetailedMixin } from '../description/Detailed';
import { ToolMixin } from './Tooled';
import { DurableMixin } from '../material/Durable';
import { CraftedMixin } from './Crafted';

// CraftedMixin closes the tools-make-tools loop: a ToolItem can be a
// recipe output (smithing makes the hammer smithing needs); the mark
// defaults empty on store-bought kit.
const ToolItemBase = CraftedMixin(ToolMixin(DurableMixin(DetailedMixin(Thing))));

export default class ToolItem extends ToolItemBase {}
