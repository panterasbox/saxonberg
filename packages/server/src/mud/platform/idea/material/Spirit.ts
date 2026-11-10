/**
 * Spirit — a drink that burns.
 *
 * A KIND of material (material decomposition): what the substance is.
 * Composes `Combustion`. Consumers never narrow on a kind — they ask for a
 * capability (`MixinApi.has<Capability>`).
 */
import Drink from "./Drink";
import { CombustionMixin } from "../../../lib/material/Combustion";

export default class Spirit extends CombustionMixin(Drink) {}
