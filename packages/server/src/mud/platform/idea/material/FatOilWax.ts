/**
 * FatOilWax — fat, oil and wax — they melt, boil and burn.
 *
 * A KIND of material (material decomposition): what the substance is.
 * Composes `Combustion`, `Fusion`, `Volatility`, `Solidity`. Consumers never
 * narrow on a kind — they ask for a capability (`MixinApi.has<Capability>`).
 */
import Organic from "../../../lib/material/Organic";
import { CombustionMixin } from "../../../lib/material/Combustion";
import { FusionMixin } from "../../../lib/material/Fusion";
import { VolatilityMixin } from "../../../lib/material/Volatility";
import { SolidityMixin } from "../../../lib/material/Solidity";

export default class FatOilWax extends CombustionMixin(
  FusionMixin(VolatilityMixin(SolidityMixin(Organic))),
) {}
