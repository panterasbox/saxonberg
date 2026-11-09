/**
 * Horn — horn, which a lantern pane is pressed from because light passes
 * through it.
 *
 * A KIND of material (material decomposition): what the substance is.
 * Composes `Optics`. Consumers never narrow on a kind — they ask for a
 * capability (`MixinApi.has<Capability>`).
 */
import HideHorn from "./HideHorn";
import { OpticsMixin } from "../../../lib/material/Optics";

export default class Horn extends OpticsMixin(HideHorn) {}
