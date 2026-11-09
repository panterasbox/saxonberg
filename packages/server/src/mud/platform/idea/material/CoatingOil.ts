/**
 * CoatingOil — a coat that burns (pitch, tar, linseed oil).
 *
 * A KIND of material (material decomposition): what the substance is.
 * Composes `Combustion`, `Volatility`. Consumers never narrow on a kind —
 * they ask for a capability (`MixinApi.has<Capability>`).
 */
import PigmentPaint from "./PigmentPaint";
import { CombustionMixin } from "../../../lib/material/Combustion";
import { VolatilityMixin } from "../../../lib/material/Volatility";

export default class CoatingOil extends CombustionMixin(
  VolatilityMixin(PigmentPaint),
) {}
