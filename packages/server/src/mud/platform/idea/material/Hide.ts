/**
 * Hide — raw skin, which spoils until it is tanned.
 *
 * A KIND of material (material decomposition): what the substance is.
 * Composes `Perishability`. Consumers never narrow on a kind — they ask for
 * a capability (`MixinApi.has<Capability>`).
 */
import HideHorn from "./HideHorn";
import { PerishabilityMixin } from "../../../lib/material/Perishability";

export default class Hide extends PerishabilityMixin(HideHorn) {}
