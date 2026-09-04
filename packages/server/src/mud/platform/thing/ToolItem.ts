/**
 * ToolItem — a portable tool: the capital side of control.
 *
 * `ToolMixin(DurableMixin(DetailedMixin(Thing)))` — a `Tangible` carrying
 * tool capabilities (ToolMixin) + a wear-on-use condition (DurableMixin, the
 * durable-good half). Backs the bar's shaker / mixing-glass (and any future
 * strainer / muddler); capabilities + condition are authored in each seed's
 * `data:`.
 */

import Thing from '../../lib/stuff/Thing';
import { DetailedMixin } from '../../lib/description/Detailed';
import { ToolMixin } from '../../lib/craft/Tooled';
import { DurableMixin } from '../../lib/material/Durable';
import { CraftedMixin } from '../../lib/craft/Crafted';

// CraftedMixin closes the tools-make-tools loop: a ToolItem can be a
// recipe output (smithing makes the hammer smithing needs); the mark
// defaults empty on store-bought kit.
// ⚠⚠ **NOT `ContaminableMixin`, and that is a correction.** It was composed
// here for one build on the argument that *this can carry pathogens between
// things* is true of a billhook and a kitchen sieve — which is true, and
// which was the wrong question. The host set is a felling axe, a sledge, a
// pick, a pick-haft, a pinch bar, a smith's hammer, an assay kit and a
// shovel: **most tools in this game are mining and smithing kit that never
// meets food.** `callable == visible == cared-about` settles it, exactly as
// it did for `Weapon` one class over.
//
// ⭐ Nor did it ever DO anything here. The only producers are the gut spill
// at a butchering and the craft's tangible output, and neither writes to a
// tool — so the mixin was surface area with no consumer, which is its own
// smell.
//
// The attach point stays open and named: a `KitchenTool` the day a sieve or
// a board genuinely needs to carry a load, the same way irrigation
// contamination composes onto `WateringCan` when someone wants it.
const ToolItemBase = CraftedMixin(ToolMixin(DurableMixin(DetailedMixin(Thing))));

export default class ToolItem extends ToolItemBase {}
