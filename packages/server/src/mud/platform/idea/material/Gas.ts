/**
 * Gas — what fills a room rather than lying in it; it boils at a low
 * temperature, may smell and may poison.
 *
 * A KIND of material (material decomposition): what the substance is.
 * Composes `Volatility`, `Odor`, `Toxicity`. Consumers never narrow on a
 * kind — they ask for a capability (`MixinApi.has<Capability>`).
 */
import Mineral from "../../../lib/material/Mineral";
import { VolatilityMixin } from "../../../lib/material/Volatility";
import { OdorMixin } from "../../../lib/material/Odor";
import { ToxicityMixin } from "../../../lib/material/Toxicity";

export default class Gas extends VolatilityMixin(
  OdorMixin(ToxicityMixin(Mineral)),
) {}
