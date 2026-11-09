/**
 * Pulp — fiber beaten into water: a slurry that freezes.
 *
 * A KIND of material (material decomposition): what the substance is.
 * Composes `Fusion`. Consumers never narrow on a kind — they ask for a
 * capability (`MixinApi.has<Capability>`).
 */
import Fiber from "./Fiber";
import { FusionMixin } from "../../../lib/material/Fusion";

export default class Pulp extends FusionMixin(Fiber) {}
