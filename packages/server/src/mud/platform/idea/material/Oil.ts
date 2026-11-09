/**
 * Oil — mineral oil and its distillates — they burn, boil and poison.
 *
 * A KIND of material (material decomposition): what the substance is.
 * Composes `Combustion`, `Fusion`, `Volatility`, `Toxicity`. Consumers never
 * narrow on a kind — they ask for a capability (`MixinApi.has<Capability>`).
 */
import Organic from "../../../lib/material/Organic";
import { CombustionMixin } from "../../../lib/material/Combustion";
import { FusionMixin } from "../../../lib/material/Fusion";
import { VolatilityMixin } from "../../../lib/material/Volatility";
import { ToxicityMixin } from "../../../lib/material/Toxicity";

export default class Oil extends CombustionMixin(
  FusionMixin(VolatilityMixin(ToxicityMixin(Organic))),
) {}
