/**
 * GlassBottle — a bottle the trade blew. `TintedMixin(AlloyedMixin(
 * Bottle))`: a kernel `Bottle` (so it holds liquid, seals, circulates and
 * counts in the empties census under its `bottle` vessel kind), made
 * `Alloyed` so it carries its sand's iron, and `Tinted` so its colour is
 * DERIVED from that iron — green from dirty sand, clear from pure, never
 * a decorative field. Full wall thickness (the default 1.0), so a bottle
 * reads a shade deeper than a pane cut from the same glass.
 *
 * ⭐ `TintedMixin` sits ONLY on glass goods like this, never on kernel
 * `Bottle`: a clay or steel bottle would need an "is it glass?" guard.
 */

import Bottle from "@saxonberg/server/mud/platform/thing/Bottle";
import { AlloyedMixin } from "@saxonberg/server/mud/lib/material/Alloyed";
import { TintedMixin } from "../lib/Tinted";

export default class GlassBottle extends TintedMixin(AlloyedMixin(Bottle)) {}
