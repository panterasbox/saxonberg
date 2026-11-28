/**
 * Ceramic — a fired body (brick, stoneware, porcelain).
 *
 * A KIND of material (material decomposition): what the substance is. Adds
 * `Degradation` (a fired body spalls in frost) — on the fired kind, not on
 * `Stone`, whose kinds include glass, sand and soil, which do not
 * (decomposition W0). Consumers never narrow on a kind — they ask for a
 * capability (`MixinApi.has<Capability>`).
 */
import Stone from "./Stone";
import { DegradationMixin } from "../../../lib/material/Degradation";

export default class Ceramic extends DegradationMixin(Stone) {}
