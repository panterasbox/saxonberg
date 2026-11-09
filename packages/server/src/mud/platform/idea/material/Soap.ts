/**
 * Soap — a salt of a fat — it cures by drying.
 *
 * A KIND of material (material decomposition): what the substance is.
 * Composes `Kinetic`, `Fusion`, `Volatility`, `Acidity`, `Solidity`,
 * `Porosity`, `Shrinkage`. Consumers never narrow on a kind — they ask for a
 * capability (`MixinApi.has<Capability>`).
 */
import Organic from "../../../lib/material/Organic";
import { KineticMixin } from "../../../lib/material/Kinetic";
import { FusionMixin } from "../../../lib/material/Fusion";
import { VolatilityMixin } from "../../../lib/material/Volatility";
import { AcidityMixin } from "../../../lib/material/Acidity";
import { SolidityMixin } from "../../../lib/material/Solidity";
import { PorosityMixin } from "../../../lib/material/Porosity";
import { ShrinkageMixin } from "../../../lib/material/Shrinkage";

export default class Soap extends KineticMixin(
  FusionMixin(
    VolatilityMixin(
      AcidityMixin(SolidityMixin(PorosityMixin(ShrinkageMixin(Organic)))),
    ),
  ),
) {}
