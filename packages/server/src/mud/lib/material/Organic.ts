/**
 * Organic — what was alive, or was made of what was (fossil fuels,
 * preparations); every organic substance has a smell of its own, even where
 * a row has not authored it yet.
 *
 * A KIND of material (material decomposition): what the substance is.
 * Composes `Odor`. Consumers never narrow on a kind — they ask for a
 * capability (`MixinApi.has<Capability>`).
 */
import Material from "./Material";
import { OdorMixin } from "./Odor";

export default abstract class Organic extends OdorMixin(Material) {}
