/**
 * Wood — wood — it burns, seasons and shrinks, and changes in the fire.
 *
 * A KIND of material (material decomposition): what the substance is.
 * Composes `Degradation`, `Solidity`, `Porosity`, `Combustion`, `Shrinkage`, `Kinetic`,
 * `Extraction` (a wooden wall gives what it holds its own aromas).
 * Consumers never narrow on a kind — they ask for a capability
 * (`MixinApi.has<Capability>`).
 */
import Plant from "../../../lib/material/Plant";
import { SolidityMixin } from "../../../lib/material/Solidity";
import { PorosityMixin } from "../../../lib/material/Porosity";
import { CombustionMixin } from "../../../lib/material/Combustion";
import { ShrinkageMixin } from "../../../lib/material/Shrinkage";
import { KineticMixin } from "../../../lib/material/Kinetic";
import { ExtractionMixin } from "../../../lib/material/Extraction";
import { DegradationMixin } from "../../../lib/material/Degradation";

export default class Wood extends DegradationMixin(
  ExtractionMixin(
    SolidityMixin(
      PorosityMixin(CombustionMixin(ShrinkageMixin(KineticMixin(Plant)))),
    ),
  ),
) {}
