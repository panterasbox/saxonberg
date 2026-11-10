/**
 * Clay — a plastic earth — a mixture with the smell of wet ground, which
 * fires.
 *
 * A KIND of material (material decomposition): what the substance is.
 * Composes `Odor`, `Mixture`. Consumers never narrow on a kind — they ask
 * for a capability (`MixinApi.has<Capability>`).
 */
import Stone from "./Stone";
import { OdorMixin } from "../../../lib/material/Odor";
import { MixtureMixin } from "../../../lib/material/Mixture";

export default class Clay extends OdorMixin(MixtureMixin(Stone)) {}
