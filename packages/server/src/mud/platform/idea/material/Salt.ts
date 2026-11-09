/**
 * Salt — an ionic compound — it dissolves, has a pH, crystallizes, melts and
 * boils.
 *
 * A KIND of material (material decomposition): what the substance is.
 * Composes `Compound`, `Solution`, `Acidity`, `Solidity`, `Fusion`,
 * `Porosity`, `Volatility`. Consumers never narrow on a kind — they ask for
 * a capability (`MixinApi.has<Capability>`).
 */
import Mineral from "../../../lib/material/Mineral";
import { CompoundMixin } from "../../../lib/material/Compound";
import { SolutionMixin } from "../../../lib/material/Solution";
import { AcidityMixin } from "../../../lib/material/Acidity";
import { SolidityMixin } from "../../../lib/material/Solidity";
import { FusionMixin } from "../../../lib/material/Fusion";
import { PorosityMixin } from "../../../lib/material/Porosity";
import { VolatilityMixin } from "../../../lib/material/Volatility";

export default class Salt extends CompoundMixin(
  SolutionMixin(
    AcidityMixin(
      SolidityMixin(FusionMixin(PorosityMixin(VolatilityMixin(Mineral)))),
    ),
  ),
) {}
