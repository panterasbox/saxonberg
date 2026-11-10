/**
 * Drink — a food that is poured.
 *
 * A KIND of material (material decomposition): what the substance is.
 * Composes `Solution`, `Volatility`. Consumers never narrow on a kind — they
 * ask for a capability (`MixinApi.has<Capability>`).
 */
import Food from "./Food";
import { SolutionMixin } from "../../../lib/material/Solution";
import { VolatilityMixin } from "../../../lib/material/Volatility";

export default class Drink extends SolutionMixin(VolatilityMixin(Food)) {}
