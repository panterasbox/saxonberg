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
import { ContaminableMixin } from '../../lib/material/Contaminable';

// CraftedMixin closes the tools-make-tools loop: a ToolItem can be a
// recipe output (smithing makes the hammer smithing needs); the mark
// defaults empty on store-bought kit.
// ⭐ **Contaminable on the CLASS, never on `ToolMixin`.** The mixin's host
// set includes a watering can, a tap and a still, and composing there would
// be the exact widening the cooking build spent four review rounds undoing.
// `ToolItem` is one of those six hosts and describes every member of itself
// honestly: *this can carry pathogens between things* is true of a billhook
// and a kitchen sieve and false of a tap. (Irrigation contamination is a
// real route and a real future consumer; it composes onto `WateringCan` the
// day somebody wants it.)
const ToolItemBase = ContaminableMixin(
  CraftedMixin(ToolMixin(DurableMixin(DetailedMixin(Thing)))),
);

export default class ToolItem extends ToolItemBase {}
