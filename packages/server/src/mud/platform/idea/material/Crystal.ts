/**
 * Crystal — a stone that is one compound (quartz).
 *
 * A KIND of material (material decomposition): what the substance is.
 * Composes `Compound`. Consumers never narrow on a kind — they ask for a
 * capability (`MixinApi.has<Capability>`).
 */
import Stone from "./Stone";
import { CompoundMixin } from "../../../lib/material/Compound";

export default class Crystal extends CompoundMixin(Stone) {}
