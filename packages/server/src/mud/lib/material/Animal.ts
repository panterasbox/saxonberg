/**
 * Animal — organic matter from an animal; it carries the species and tissue
 * it came from.
 *
 * A KIND of material (material decomposition): what the substance is.
 * Composes `Tissue`. Consumers never narrow on a kind — they ask for a
 * capability (`MixinApi.has<Capability>`).
 */
import Organic from "./Organic";
import { TissueMixin } from "./Tissue";

export default abstract class Animal extends TissueMixin(Organic) {}
