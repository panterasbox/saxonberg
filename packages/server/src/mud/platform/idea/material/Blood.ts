/**
 * Blood — blood — it spoils, and freezing ruins it.
 *
 * A KIND of material (material decomposition): what the substance is.
 * Composes `Perishability`, `Fusion`. Consumers never narrow on a kind —
 * they ask for a capability (`MixinApi.has<Capability>`).
 */
import Animal from "../../../lib/material/Animal";
import { PerishabilityMixin } from "../../../lib/material/Perishability";
import { FusionMixin } from "../../../lib/material/Fusion";

export default class Blood extends PerishabilityMixin(FusionMixin(Animal)) {}
