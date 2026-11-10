/**
 * Soil — earth you grow in; it smells.
 *
 * A KIND of material (material decomposition): what the substance is.
 * Composes `Odor`. Consumers never narrow on a kind — they ask for a
 * capability (`MixinApi.has<Capability>`).
 */
import Stone from "./Stone";
import { OdorMixin } from "../../../lib/material/Odor";

export default class Soil extends OdorMixin(Stone) {}
