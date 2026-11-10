/**
 * Fat — a fat a body eats, which turns rancid.
 *
 * A KIND of material (material decomposition): what the substance is.
 * Composes `Edibility`, `Perishability`. Consumers never narrow on a kind —
 * they ask for a capability (`MixinApi.has<Capability>`).
 */
import FatOilWax from "./FatOilWax";
import { EdibilityMixin } from "../../../lib/material/Edibility";
import { PerishabilityMixin } from "../../../lib/material/Perishability";

export default class Fat extends EdibilityMixin(
  PerishabilityMixin(FatOilWax),
) {}
