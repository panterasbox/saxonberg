/**
 * Wood — wood — it burns, seasons and shrinks, and changes in the fire.
 *
 * A KIND of material (material decomposition): what the substance is.
 * Composes `Solidity`, `Porosity`, `Combustion`, `Shrinkage`, `Kinetic`.
 * Consumers never narrow on a kind — they ask for a capability
 * (`MixinApi.has<Capability>`).
 */
import Plant from "../../../lib/material/Plant";
import { SolidityMixin } from "../../../lib/material/Solidity";
import { PorosityMixin } from "../../../lib/material/Porosity";
import { CombustionMixin } from "../../../lib/material/Combustion";
import { ShrinkageMixin } from "../../../lib/material/Shrinkage";
import { KineticMixin } from "../../../lib/material/Kinetic";

export default class Wood extends SolidityMixin(
  PorosityMixin(CombustionMixin(ShrinkageMixin(KineticMixin(Plant)))),
) {}
