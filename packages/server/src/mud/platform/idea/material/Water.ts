/**
 * Water — water in all its states, clean or carrying what is dissolved in
 * it.
 *
 * A KIND of material (material decomposition): what the substance is.
 * Composes `Compound`, `Fusion`, `Volatility`, `Solution`, `Edibility`,
 * `Toxicity`, `Acidity`, `Optics`, `Odor`. Consumers never narrow on a kind
 * — they ask for a capability (`MixinApi.has<Capability>`).
 */
import Mineral from "../../../lib/material/Mineral";
import { CompoundMixin } from "../../../lib/material/Compound";
import { FusionMixin } from "../../../lib/material/Fusion";
import { VolatilityMixin } from "../../../lib/material/Volatility";
import { SolutionMixin } from "../../../lib/material/Solution";
import { EdibilityMixin } from "../../../lib/material/Edibility";
import { ToxicityMixin } from "../../../lib/material/Toxicity";
import { AcidityMixin } from "../../../lib/material/Acidity";
import { OpticsMixin } from "../../../lib/material/Optics";
import { OdorMixin } from "../../../lib/material/Odor";

export default class Water extends CompoundMixin(
  FusionMixin(
    VolatilityMixin(
      SolutionMixin(
        EdibilityMixin(
          ToxicityMixin(AcidityMixin(OpticsMixin(OdorMixin(Mineral)))),
        ),
      ),
    ),
  ),
) {}
