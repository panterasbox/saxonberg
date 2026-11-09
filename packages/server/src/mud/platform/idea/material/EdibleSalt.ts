/**
 * EdibleSalt — a salt you season food with (halite, salt).
 *
 * A KIND of material (material decomposition): what the substance is.
 * Composes `Edibility`, `Perishability`. Consumers never narrow on a kind —
 * they ask for a capability (`MixinApi.has<Capability>`).
 */
import Salt from "./Salt";
import { EdibilityMixin } from "../../../lib/material/Edibility";
import { PerishabilityMixin } from "../../../lib/material/Perishability";

export default class EdibleSalt extends EdibilityMixin(
  PerishabilityMixin(Salt),
) {}
