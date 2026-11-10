/**
 * ToxicAlloy — an alloy that poisons — what its face gives its contents
 * (pewter).
 *
 * A KIND of material (material decomposition): what the substance is.
 * Composes `Toxicity`. Consumers never narrow on a kind — they ask for a
 * capability (`MixinApi.has<Capability>`).
 */
import Alloy from "./Alloy";
import { ToxicityMixin } from "../../../lib/material/Toxicity";

export default class ToxicAlloy extends ToxicityMixin(Alloy) {}
