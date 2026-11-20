/**
 * ToxicAlloy — an alloy that poisons — what its face gives its contents
 * (pewter).
 *
 * A KIND of material (material decomposition): what the substance is.
 * Composes `Toxicity`, `Extraction` (a pewter wall leaches). Consumers never narrow on a kind — they ask for a
 * capability (`MixinApi.has<Capability>`).
 */
import Alloy from "./Alloy";
import { ToxicityMixin } from "../../../lib/material/Toxicity";
import { ExtractionMixin } from "../../../lib/material/Extraction";

export default class ToxicAlloy extends ExtractionMixin(ToxicityMixin(Alloy)) {}
