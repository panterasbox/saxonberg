/**
 * PigmentPaint — a coat: pigment, paint, glaze, ink — mineral and organic
 * alike, so it sits outside that split.
 *
 * A KIND of material (material decomposition): what the substance is.
 * Composes `Coating`, `Odor`, `Kinetic`, `Fusion`, `Solution`, `Solidity`,
 * `Toxicity`, `Acidity`. Consumers never narrow on a kind — they ask for a
 * capability (`MixinApi.has<Capability>`).
 */
import Material from "../../../lib/material/Material";
import { CoatingMixin } from "../../../lib/material/Coating";
import { OdorMixin } from "../../../lib/material/Odor";
import { KineticMixin } from "../../../lib/material/Kinetic";
import { FusionMixin } from "../../../lib/material/Fusion";
import { SolutionMixin } from "../../../lib/material/Solution";
import { SolidityMixin } from "../../../lib/material/Solidity";
import { ToxicityMixin } from "../../../lib/material/Toxicity";
import { AcidityMixin } from "../../../lib/material/Acidity";

export default class PigmentPaint extends CoatingMixin(
  OdorMixin(
    KineticMixin(
      FusionMixin(
        SolutionMixin(SolidityMixin(ToxicityMixin(AcidityMixin(Material)))),
      ),
    ),
  ),
) {}
