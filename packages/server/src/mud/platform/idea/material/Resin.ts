/**
 * Resin — a glue that burns (rosin).
 *
 * A KIND of material (material decomposition): what the substance is.
 * Composes `Combustion`, `Volatility`. Consumers never narrow on a kind —
 * they ask for a capability (`MixinApi.has<Capability>`).
 */
import Glue from "./Glue";
import { CombustionMixin } from "../../../lib/material/Combustion";
import { VolatilityMixin } from "../../../lib/material/Volatility";

export default class Resin extends CombustionMixin(VolatilityMixin(Glue)) {}
