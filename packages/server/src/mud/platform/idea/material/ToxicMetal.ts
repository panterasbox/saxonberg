/**
 * ToxicMetal — an elemental metal that poisons (lead).
 *
 * A KIND of material (material decomposition): what the substance is.
 * Composes `Toxicity`, `Extraction` (a lead wall leaches). Consumers never narrow on a kind — they ask for a
 * capability (`MixinApi.has<Capability>`).
 */
import ElementalMetal from "./ElementalMetal";
import { ToxicityMixin } from "../../../lib/material/Toxicity";
import { ExtractionMixin } from "../../../lib/material/Extraction";

export default class ToxicMetal extends ExtractionMixin(ToxicityMixin(ElementalMetal)) {}
