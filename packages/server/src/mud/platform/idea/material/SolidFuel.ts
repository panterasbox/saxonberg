/**
 * SolidFuel — what a fire is fed (coal, charcoal, peat, ash).
 *
 * A KIND of material (material decomposition): what the substance is.
 * Composes `Combustion`, `Porosity`, `Solidity`, `Mixture`, `Kinetic`.
 * Consumers never narrow on a kind — they ask for a capability
 * (`MixinApi.has<Capability>`).
 */
import Organic from "../../../lib/material/Organic";
import { CombustionMixin } from "../../../lib/material/Combustion";
import { PorosityMixin } from "../../../lib/material/Porosity";
import { SolidityMixin } from "../../../lib/material/Solidity";
import { MixtureMixin } from "../../../lib/material/Mixture";
import { KineticMixin } from "../../../lib/material/Kinetic";

export default class SolidFuel extends CombustionMixin(
  PorosityMixin(SolidityMixin(MixtureMixin(KineticMixin(Organic)))),
) {}
