/**
 * Metal — a metal — it has a mechanical response, melts and boils.
 *
 * A KIND of material (material decomposition): what the substance is.
 * Composes `Degradation`, `Solidity`, `Fusion`, `Volatility`. Consumers never narrow on a
 * kind — they ask for a capability (`MixinApi.has<Capability>`).
 */
import Mineral from "../../../lib/material/Mineral";
import { SolidityMixin } from "../../../lib/material/Solidity";
import { FusionMixin } from "../../../lib/material/Fusion";
import { VolatilityMixin } from "../../../lib/material/Volatility";
import { DegradationMixin } from "../../../lib/material/Degradation";

export default class Metal extends DegradationMixin(
  SolidityMixin(FusionMixin(VolatilityMixin(Mineral))),
) {}
