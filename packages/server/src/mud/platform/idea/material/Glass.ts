/**
 * Glass — a stone that light passes through.
 *
 * A KIND of material (material decomposition): what the substance is.
 * Composes `Optics`. Consumers never narrow on a kind — they ask for a
 * capability (`MixinApi.has<Capability>`).
 */
import Stone from "./Stone";
import { OpticsMixin } from "../../../lib/material/Optics";

export default class Glass extends OpticsMixin(Stone) {}
