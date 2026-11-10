/**
 * NonMetal — a solid element that is not a metal; it burns (carbon, sulfur).
 *
 * A KIND of material (material decomposition): what the substance is.
 * Composes `Element`, `Solidity`, `Fusion`, `Combustion`, `Odor`. Consumers
 * never narrow on a kind — they ask for a capability
 * (`MixinApi.has<Capability>`).
 */
import Mineral from "../../../lib/material/Mineral";
import { ElementMixin } from "../../../lib/material/Element";
import { SolidityMixin } from "../../../lib/material/Solidity";
import { FusionMixin } from "../../../lib/material/Fusion";
import { CombustionMixin } from "../../../lib/material/Combustion";
import { OdorMixin } from "../../../lib/material/Odor";

export default class NonMetal extends ElementMixin(
  SolidityMixin(FusionMixin(CombustionMixin(OdorMixin(Mineral)))),
) {}
