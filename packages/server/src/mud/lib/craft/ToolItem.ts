/**
 * ToolItem — a portable tool: the capital side of control.
 *
 * `ToolMixin(DetailedMixin(Thing))` — a `Tangible` carrying tool
 * capabilities + a wear-on-use condition. Backs the bar's shaker / mixing-
 * glass (and any future strainer / muddler); capabilities + condition are
 * authored in each seed's `data:`.
 */

import Thing from '../stuff/Thing';
import { DetailedMixin } from '../description/Detailed';
import { ToolMixin } from './Tooled';

const ToolItemBase = ToolMixin(DetailedMixin(Thing));

export default class ToolItem extends ToolItemBase {}
