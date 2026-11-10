/**
 * FuelGas — a gas, or an airborne dust, that burns (coal gas, firedamp,
 * flour dust).
 *
 * A KIND of material (material decomposition): what the substance is.
 * Composes `Combustion`. Consumers never narrow on a kind — they ask for a
 * capability (`MixinApi.has<Capability>`).
 */
import Gas from "./Gas";
import { CombustionMixin } from "../../../lib/material/Combustion";

export default class FuelGas extends CombustionMixin(Gas) {}
