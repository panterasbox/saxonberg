/**
 * Polymer — rubber and its kin — a mixture that cures, burns and melts.
 *
 * A KIND of material (material decomposition): what the substance is.
 * Composes `Solidity`, `Kinetic`, `Combustion`, `Fusion`, `Porosity`,
 * `Mixture`. Consumers never narrow on a kind — they ask for a capability
 * (`MixinApi.has<Capability>`).
 */
import Organic from "../../../lib/material/Organic";
import { SolidityMixin } from "../../../lib/material/Solidity";
import { KineticMixin } from "../../../lib/material/Kinetic";
import { CombustionMixin } from "../../../lib/material/Combustion";
import { FusionMixin } from "../../../lib/material/Fusion";
import { PorosityMixin } from "../../../lib/material/Porosity";
import { MixtureMixin } from "../../../lib/material/Mixture";

export default class Polymer extends SolidityMixin(
  KineticMixin(
    CombustionMixin(FusionMixin(PorosityMixin(MixtureMixin(Organic)))),
  ),
) {}
