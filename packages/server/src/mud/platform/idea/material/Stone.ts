/**
 * Stone — rock and earth — solid, porous, melts at a forge heat and changes
 * in a kiln.
 *
 * A KIND of material (material decomposition): what the substance is.
 * Composes `Solidity`, `Porosity`, `Fusion`, `Kinetic`. Consumers never
 * narrow on a kind — they ask for a capability (`MixinApi.has<Capability>`).
 */
import Mineral from "../../../lib/material/Mineral";
import { SolidityMixin } from "../../../lib/material/Solidity";
import { PorosityMixin } from "../../../lib/material/Porosity";
import { FusionMixin } from "../../../lib/material/Fusion";
import { KineticMixin } from "../../../lib/material/Kinetic";

export default class Stone extends SolidityMixin(
  PorosityMixin(FusionMixin(KineticMixin(Mineral))),
) {}
