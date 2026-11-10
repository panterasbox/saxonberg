/**
 * Syrup — a food that is a solution boiled down — maple syrup, molasses,
 * caramel.
 *
 * A KIND of material (material decomposition): what the substance is.
 * Composes `Solution`, `Volatility`, `Fusion`, `Kinetic`. Consumers never
 * narrow on a kind — they ask for a capability (`MixinApi.has<Capability>`).
 */
import Food from "./Food";
import { SolutionMixin } from "../../../lib/material/Solution";
import { VolatilityMixin } from "../../../lib/material/Volatility";
import { FusionMixin } from "../../../lib/material/Fusion";
import { KineticMixin } from "../../../lib/material/Kinetic";

export default class Syrup extends SolutionMixin(
  VolatilityMixin(FusionMixin(KineticMixin(Food))),
) {}
