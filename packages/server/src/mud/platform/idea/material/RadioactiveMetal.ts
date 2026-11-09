/**
 * RadioactiveMetal — a toxic elemental metal whose nuclei decay (uranium).
 *
 * A KIND of material (material decomposition): what the substance is.
 * Composes `Radioactivity`. Consumers never narrow on a kind — they ask for
 * a capability (`MixinApi.has<Capability>`).
 */
import ToxicMetal from "./ToxicMetal";
import { RadioactivityMixin } from "../../../lib/material/Radioactivity";

export default class RadioactiveMetal extends RadioactivityMixin(ToxicMetal) {}
