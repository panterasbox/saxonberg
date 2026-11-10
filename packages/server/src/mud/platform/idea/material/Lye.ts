/**
 * Lye — an alkali — caustic, poisonous, dissolving (lye, potash, quicklime).
 *
 * A KIND of material (material decomposition): what the substance is.
 * Composes `Acidity`, `Solution`, `Toxicity`, `Odor`, `Fusion`,
 * `Volatility`, `Porosity`, `Kinetic`. Consumers never narrow on a kind —
 * they ask for a capability (`MixinApi.has<Capability>`).
 */
import Mineral from "../../../lib/material/Mineral";
import { AcidityMixin } from "../../../lib/material/Acidity";
import { SolutionMixin } from "../../../lib/material/Solution";
import { ToxicityMixin } from "../../../lib/material/Toxicity";
import { OdorMixin } from "../../../lib/material/Odor";
import { FusionMixin } from "../../../lib/material/Fusion";
import { VolatilityMixin } from "../../../lib/material/Volatility";
import { PorosityMixin } from "../../../lib/material/Porosity";
import { KineticMixin } from "../../../lib/material/Kinetic";

export default class Lye extends AcidityMixin(
  SolutionMixin(
    ToxicityMixin(
      OdorMixin(
        FusionMixin(VolatilityMixin(PorosityMixin(KineticMixin(Mineral)))),
      ),
    ),
  ),
) {}
