/**
 * ToxicMetal — an elemental metal that poisons (lead).
 *
 * A KIND of material (material decomposition): what the substance is.
 * Composes `Toxicity`. Consumers never narrow on a kind — they ask for a
 * capability (`MixinApi.has<Capability>`).
 */
import ElementalMetal from "./ElementalMetal";
import { ToxicityMixin } from "../../../lib/material/Toxicity";

export default class ToxicMetal extends ToxicityMixin(ElementalMetal) {}
