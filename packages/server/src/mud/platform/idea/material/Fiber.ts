/**
 * Fiber — plant fiber — cellulose, which burns and rots.
 *
 * A KIND of material (material decomposition): what the substance is.
 * Composes `Degradation`, `Solidity`, `Porosity`, `Combustion`, `Compound`, `Kinetic`.
 * Consumers never narrow on a kind — they ask for a capability
 * (`MixinApi.has<Capability>`).
 */
import Plant from "../../../lib/material/Plant";
import { SolidityMixin } from "../../../lib/material/Solidity";
import { PorosityMixin } from "../../../lib/material/Porosity";
import { CombustionMixin } from "../../../lib/material/Combustion";
import { CompoundMixin } from "../../../lib/material/Compound";
import { KineticMixin } from "../../../lib/material/Kinetic";
import { DegradationMixin } from "../../../lib/material/Degradation";

export default class Fiber extends DegradationMixin(
  SolidityMixin(
    PorosityMixin(CombustionMixin(CompoundMixin(KineticMixin(Plant)))),
  ),
) {}
